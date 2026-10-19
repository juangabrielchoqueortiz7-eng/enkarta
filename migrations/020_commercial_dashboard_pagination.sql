-- Ventas: métricas completas y contactos paginados. Ejecutar después de 019.
-- Reaplicable y de solo lectura: no cambia contactos, historial, pagos ni recursos.
BEGIN;

CREATE INDEX IF NOT EXISTS commercial_leads_created_page
  ON public.commercial_leads(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS commercial_leads_status_created_page
  ON public.commercial_leads(status,created_at DESC,id DESC);

-- Una sentencia conserva una instantánea coherente de métricas, totales y página.
-- asOf fija el corte de altas y eventos; el estado del contacto sigue siendo actual.
-- No descarga la tabla al cliente ni depende del límite de filas de PostgREST.
CREATE OR REPLACE FUNCTION public.enkarta_commercial_dashboard(
  p_status text DEFAULT 'all',p_size integer DEFAULT 25,p_as_of timestamptz DEFAULT NULL,
  p_after_created_at timestamptz DEFAULT NULL,p_after_id uuid DEFAULT NULL,
  p_design_labels jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE
  anchor timestamptz := coalesce(p_as_of,statement_timestamp());
  cutoff timestamptz;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('all','whatsapp_open','contacted','reserved','won','lost')
    OR p_size IS DISTINCT FROM 25 OR NOT isfinite(anchor)
    OR anchor<'2000-01-01T00:00:00Z'::timestamptz OR anchor>statement_timestamp()+interval '60 seconds'
    OR (p_after_created_at IS NULL) IS DISTINCT FROM (p_after_id IS NULL)
    OR p_design_labels IS NULL OR jsonb_typeof(p_design_labels)<>'object'
    OR octet_length(p_design_labels::text)>65536
  THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  cutoff := anchor-interval '4320 hours';
  IF (p_after_created_at IS NOT NULL AND (NOT isfinite(p_after_created_at)
      OR p_after_created_at<cutoff OR p_after_created_at>anchor))
    OR (SELECT count(*)>256 FROM jsonb_each(p_design_labels))
    OR EXISTS(SELECT 1 FROM jsonb_each(p_design_labels) entry
      WHERE char_length(entry.key)>80 OR jsonb_typeof(entry.value)<>'string'
        OR char_length(entry.value #>> '{}')>80 OR (entry.value #>> '{}') ~ '[[:cntrl:]]')
  THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  RETURN (
    WITH base AS MATERIALIZED (
      -- El agregado no materializa notas ni campos privados de todos los contactos.
      SELECT l.status,l.revenue_bs,l.utm_source,l.referrer_host,l.utm_campaign,
        l.package_key,l.event_category,l.design FROM public.commercial_leads l
      WHERE l.created_at>=cutoff AND l.created_at<=anchor
    ), event_metrics AS (
      SELECT count(DISTINCT session_hash) FILTER(WHERE event_type IN ('landing_view','design_view','process_view')) AS visits,
        count(DISTINCT session_hash) FILTER(WHERE event_type='landing_view') AS landing,
        count(DISTINCT session_hash) FILTER(WHERE event_type='design_view') AS design,
        count(DISTINCT session_hash) FILTER(WHERE event_type='process_view') AS process
      FROM public.commercial_events WHERE occurred_at>=cutoff AND occurred_at<=anchor
    ), lead_metrics AS (
      SELECT count(*) AS opens,count(*) FILTER(WHERE status<>'whatsapp_open') AS contacts,
        count(*) FILTER(WHERE status IN ('reserved','won')) AS reserved,count(*) FILTER(WHERE status='won') AS sales,
        coalesce(sum(revenue_bs) FILTER(WHERE status='won'),0) AS revenue FROM base
    ), candidates AS MATERIALIZED (
      -- La página puede usar el índice del cursor, sin ordenar el agregado completo.
      SELECT id,created_at FROM public.commercial_leads
      WHERE created_at>=cutoff AND created_at<=anchor AND (p_status='all' OR status=p_status)
        AND (p_after_created_at IS NULL OR (created_at,id)<(p_after_created_at,p_after_id))
      ORDER BY created_at DESC,id DESC LIMIT 26
    ), selected_page AS MATERIALIZED (
      SELECT * FROM candidates ORDER BY created_at DESC,id DESC LIMIT 25
    ), breakdowns AS (
      SELECT dimension,label,count(*) AS opens,count(*) FILTER(WHERE status<>'whatsapp_open') AS contacts,
        count(*) FILTER(WHERE status='won') AS sales
      FROM base CROSS JOIN LATERAL (VALUES
        ('sources',coalesce(nullif(utm_source,''),nullif(referrer_host,''),'Directo')),
        ('campaigns',coalesce(nullif(utm_campaign,''),'Sin campaña')),
        ('packages',CASE package_key WHEN 'plus' THEN 'Plus' WHEN 'premium' THEN 'Premium' WHEN 'exclusive' THEN 'Exclusive' ELSE 'Sin paquete' END),
        ('events',coalesce(nullif(event_category,''),'Sin categoría')),
        ('designs',coalesce(nullif(coalesce(p_design_labels->>base.design,base.design),''),'Sin diseño'))
      ) labels(dimension,label)
      GROUP BY dimension,label
    ), ranked_breakdowns AS (
      SELECT *,row_number() OVER(PARTITION BY dimension ORDER BY opens DESC,label COLLATE "C") AS position FROM breakdowns
    ), grouped_breakdowns AS (
      SELECT dimension,jsonb_agg(jsonb_build_object('label',label,'opens',opens,'contacts',contacts,'sales',sales)
        ORDER BY position) AS values FROM ranked_breakdowns WHERE position<=8 GROUP BY dimension
    )
    SELECT jsonb_build_object(
      'periodDays',180,'asOf',to_char(anchor AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'syncedAt',to_char(statement_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'summary',(SELECT jsonb_build_object('visits',e.visits,'landingViews',e.landing,'designViews',e.design,
        'processViews',e.process,'whatsappOpens',l.opens,'contacts',l.contacts,'reserved',l.reserved,'sales',l.sales,'revenue',l.revenue,
        'intentRate',CASE WHEN e.visits=0 THEN 0 ELSE round(l.opens*100.0/e.visits) END,
        'conversationRate',CASE WHEN l.opens=0 THEN 0 ELSE round(l.contacts*100.0/l.opens) END,
        'closeRate',CASE WHEN l.contacts=0 THEN 0 ELSE round(l.sales*100.0/l.contacts) END) FROM event_metrics e CROSS JOIN lead_metrics l),
      'sources',coalesce((SELECT values FROM grouped_breakdowns WHERE dimension='sources'),'[]'::jsonb),
      'campaigns',coalesce((SELECT values FROM grouped_breakdowns WHERE dimension='campaigns'),'[]'::jsonb),
      'packages',coalesce((SELECT values FROM grouped_breakdowns WHERE dimension='packages'),'[]'::jsonb),
      'events',coalesce((SELECT values FROM grouped_breakdowns WHERE dimension='events'),'[]'::jsonb),
      'designs',coalesce((SELECT values FROM grouped_breakdowns WHERE dimension='designs'),'[]'::jsonb),
      'statuses',(SELECT jsonb_agg(jsonb_build_object('status',s.status,'value',(SELECT count(*) FROM base b WHERE b.status=s.status)) ORDER BY s.position)
        FROM unnest(ARRAY['whatsapp_open','contacted','reserved','won','lost']) WITH ORDINALITY s(status,position)),
      'leads',coalesce((SELECT jsonb_agg(public.enkarta_commercial_lead_snapshot(l)||jsonb_build_object(
          'created_at',to_char(l.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'updated_at',to_char(l.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))
        ORDER BY l.created_at DESC,l.id DESC)
        FROM public.commercial_leads l JOIN selected_page p ON p.id=l.id),'[]'::jsonb),
      'pagination',jsonb_build_object('size',25,'total',(SELECT count(*) FROM base WHERE p_status='all' OR status=p_status),'hasMore',(SELECT count(*)>25 FROM candidates),
        'next',CASE WHEN (SELECT count(*)>25 FROM candidates) THEN
          (SELECT jsonb_build_object('createdAt',to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'id',id)
            FROM selected_page ORDER BY created_at,id LIMIT 1) ELSE NULL END)
    )
  );
END; $$;
REVOKE ALL ON FUNCTION public.enkarta_commercial_dashboard(text,integer,timestamptz,timestamptz,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_commercial_dashboard(text,integer,timestamptz,timestamptz,uuid,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;

SELECT to_regprocedure('public.enkarta_commercial_dashboard(text,integer,timestamptz,timestamptz,uuid,jsonb)') IS NOT NULL
  AND NOT coalesce((SELECT prosecdef FROM pg_proc WHERE oid='public.enkarta_commercial_dashboard(text,integer,timestamptz,timestamptz,uuid,jsonb)'::regprocedure),true)
  AND to_regclass('public.commercial_leads_created_page') IS NOT NULL
  AND to_regclass('public.commercial_leads_status_created_page') IS NOT NULL
  AND NOT has_function_privilege('anon','public.enkarta_commercial_dashboard(text,integer,timestamptz,timestamptz,uuid,jsonb)','EXECUTE')
  AND NOT has_function_privilege('authenticated','public.enkarta_commercial_dashboard(text,integer,timestamptz,timestamptz,uuid,jsonb)','EXECUTE')
  AND has_function_privilege('service_role','public.enkarta_commercial_dashboard(text,integer,timestamptz,timestamptz,uuid,jsonb)','EXECUTE')
  AS commercial_dashboard_pagination_ready;
