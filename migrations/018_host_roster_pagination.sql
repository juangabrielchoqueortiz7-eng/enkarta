-- Ejecutar completa después de 017, antes de desplegar la paginación del padrón.
-- Aditiva y reaplicable: no cambia invitados, diseños, recursos, QR ni pagos.
BEGIN;

CREATE OR REPLACE FUNCTION public.enkarta_roster_text(value text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
  SELECT lower(btrim(regexp_replace(normalize(coalesce(value,''), NFD), U&'[\0300-\036f]', '', 'g')));
$$;
CREATE OR REPLACE FUNCTION public.enkarta_roster_phone(value text)
RETURNS text LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
DECLARE digits text; source text := btrim(coalesce(value,''));
BEGIN
  source := regexp_replace(source, '^''(?=\+[0-9])', '');
  IF source = '' OR source !~ '^[+0-9[:space:]().-]+$' THEN RETURN ''; END IF;
  digits := regexp_replace(source,'[^0-9]','','g');
  IF left(digits,2)='00' THEN digits := substr(digits,3); END IF;
  IF length(digits)=8 THEN digits := '591'||digits; END IF;
  RETURN CASE WHEN length(digits) BETWEEN 8 AND 15 AND left(digits,1)<>'0' THEN '+'||digits ELSE '' END;
END; $$;
CREATE OR REPLACE FUNCTION public.enkarta_roster_sort(value text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE SET search_path = '' AS $$
  SELECT coalesce(string_agg(CASE WHEN part[1] ~ '^[0-9]+$' THEN lpad(part[1],20,'0') ELSE part[1] END,'' ORDER BY ord),'')
  FROM regexp_matches(public.enkarta_roster_text(value),'[0-9]+|[^0-9]+','g') WITH ORDINALITY AS pieces(part,ord);
$$;

-- Una sentencia = una instantánea coherente de filas, métricas, filtros y acceso.
-- El tamaño normal es 25; 250 se reserva a la exportación autenticada por lotes.
-- Los seleccionados (editor y contacto actual) se leen aunque estén en otra página.
CREATE OR REPLACE FUNCTION public.enkarta_host_roster(
  p_invitation_id uuid, p_filter jsonb DEFAULT '{}'::jsonb,
  p_page integer DEFAULT 1, p_size integer DEFAULT 25,
  p_selected uuid[] DEFAULT '{}'::uuid[], p_tables boolean DEFAULT true, p_qr boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = '' AS $$
BEGIN
  IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 1000000 OR p_size IS NULL OR p_size NOT IN (25,250)
    OR p_filter IS NULL OR jsonb_typeof(p_filter)<>'object' OR length(p_filter::text)>2048
    OR coalesce(cardinality(p_selected),0)>2 THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  RETURN (
    WITH base AS MATERIALIZED (
      SELECT g.*, coalesce((SELECT count(*)::int FROM public.attendees a WHERE a.guest_id=g.id AND a.state='in'),0) AS inside,
        coalesce(g.guest_metadata->>'group','') AS group_name,
        public.enkarta_roster_phone(g.guest_metadata->>'phone') AS phone,
        CASE WHEN g.status<>'pending' THEN 'responded' WHEN g.delivery_status='marked' OR g.sent THEN 'marked'
          WHEN g.delivery_status='opened' THEN 'opened' ELSE 'pending' END AS delivery
      FROM public.guests g WHERE g.invitation_id=p_invitation_id
    ), filtered AS MATERIALIZED (
      SELECT * FROM base g WHERE
        (coalesce(p_filter->>'search','')='' OR EXISTS (SELECT 1 FROM unnest(ARRAY[g.name,g.confirm_name,g.guest_metadata->>'phone',g.group_name,
          CASE WHEN p_tables THEN g.table_no END, CASE WHEN p_qr THEN g.access_code END]) v
          WHERE strpos(public.enkarta_roster_text(v),public.enkarta_roster_text(p_filter->>'search'))>0))
        AND (coalesce(p_filter->>'status','all')='all' OR g.status=p_filter->>'status')
        AND (coalesce(p_filter->>'delivery','all')='all' OR g.delivery=p_filter->>'delivery')
        AND (coalesce(p_filter->>'group','all')='all' OR CASE WHEN p_filter->>'group'='unassigned' THEN g.group_name='' ELSE g.group_name=p_filter->>'group' END)
        AND (NOT p_tables OR coalesce(p_filter->>'table','all')='all' OR CASE WHEN p_filter->>'table'='unassigned' THEN coalesce(btrim(g.table_no),'')='' ELSE btrim(g.table_no)=p_filter->>'table' END)
        AND (NOT p_qr OR coalesce(p_filter->>'access','all')='all' OR (p_filter->>'access'='inside' AND g.inside>0)
          OR (p_filter->>'access'='waiting' AND g.status='confirmed' AND g.inside<coalesce(g.confirmed_passes,g.passes)))
    ), ordered AS MATERIALIZED (
      SELECT g.*, row_number() OVER (ORDER BY
        CASE WHEN p_filter->>'sort'='recent' THEN g.responded_at END DESC NULLS LAST,
        CASE WHEN p_tables AND p_filter->>'sort'='table' THEN public.enkarta_roster_sort(nullif(btrim(g.table_no),'')) END NULLS LAST,
        public.enkarta_roster_text(g.name),g.name,g.id) AS seq FROM filtered g
    ), counts AS (
      SELECT count(*)::int AS total, greatest(1,ceil(count(*)::numeric/p_size)::int) AS pages,
        md5(coalesce(string_agg(id::text||':'||response_revision||':'||inside,',' ORDER BY seq),'')) AS version FROM ordered
    ), bounds AS (SELECT *,least(p_page,pages) AS page FROM counts),
    selected_page AS (SELECT g.* FROM ordered g,bounds b WHERE seq>(b.page-1)*p_size AND seq<=b.page*p_size),
    queues AS (
      SELECT purpose,jsonb_build_object(
        'ids',coalesce((SELECT jsonb_agg(id ORDER BY seq) FROM (SELECT id,seq FROM ordered WHERE status='pending' AND phone<>'' AND (purpose='reminder' OR delivery='pending') ORDER BY seq LIMIT 200) eligible),'[]'::jsonb),
        'overflow',greatest(0,(SELECT count(*) FROM ordered WHERE status='pending' AND phone<>'' AND (purpose='reminder' OR delivery='pending'))-200),
        'invalidPhone',(SELECT count(*) FROM ordered WHERE status='pending' AND phone='' AND (purpose='reminder' OR delivery='pending')),
        'excluded',(SELECT count(*) FROM ordered WHERE status<>'pending' OR (purpose='invitation' AND delivery<>'pending'))
      ) AS value FROM unnest(ARRAY['invitation','reminder']) purpose
    )
    SELECT jsonb_build_object(
      'syncedAt',statement_timestamp(),
      'guests',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY seq) FROM selected_page g),'[]'::jsonb),
      'selectedGuests',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.id) FROM base g WHERE g.id=ANY(p_selected)),'[]'::jsonb),
      'rsvps',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.at,r.id) FROM public.rsvps r WHERE r.invitation_id=p_invitation_id),'[]'::jsonb),
      'metrics',(SELECT jsonb_build_object('total',count(*),'passes',coalesce(sum(passes),0),'sent',count(*) FILTER(WHERE sent),
        'confirmed',count(*) FILTER(WHERE status='confirmed'),'pending',count(*) FILTER(WHERE status='pending'),'declined',count(*) FILTER(WHERE status='declined'),
        'confirmedPasses',coalesce(sum(coalesce(confirmed_passes,passes)) FILTER(WHERE status='confirmed'),0),
        'checkedIn',CASE WHEN p_qr THEN coalesce(sum(inside),0) ELSE 0 END,
        'unassigned',count(*) FILTER(WHERE status='confirmed' AND (NOT p_tables OR coalesce(btrim(table_no),'')=''))) FROM base),
      'roster',(SELECT jsonb_build_object('page',page,'pages',pages,'total',total,'size',p_size,'version',version,
        'from',CASE WHEN total=0 THEN 0 ELSE (page-1)*p_size+1 END,'to',least(page*p_size,total),
        'groups',coalesce((SELECT jsonb_agg(group_name ORDER BY group_name) FROM (SELECT DISTINCT group_name FROM base WHERE group_name<>'') groups),'[]'::jsonb),
        'tables',CASE WHEN p_tables THEN coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY public.enkarta_roster_sort(t.name),t.name) FROM (
          SELECT btrim(table_no) AS name,coalesce(sum(coalesce(confirmed_passes,passes)) FILTER(WHERE status='confirmed'),0) AS confirmed
          FROM base WHERE coalesce(btrim(table_no),'')<>'' GROUP BY btrim(table_no)) t),'[]'::jsonb) ELSE '[]'::jsonb END,
        'invitationQueue',(SELECT value FROM queues WHERE purpose='invitation'),'reminderQueue',(SELECT value FROM queues WHERE purpose='reminder')) FROM bounds)
    )
  );
END; $$;

-- Comprueba únicamente hasta 200 candidatos de un CSV, incluso fuera de página.
-- Devuelve índices; nunca descarga todos los nombres/teléfonos del padrón.
CREATE OR REPLACE FUNCTION public.enkarta_roster_duplicates(p_invitation_id uuid,p_candidates jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = '' AS $$
BEGIN
  IF jsonb_typeof(p_candidates) IS DISTINCT FROM 'array' OR jsonb_array_length(p_candidates)>200
    OR length(p_candidates::text)>40000 THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  RETURN (SELECT coalesce(jsonb_agg(ord-1 ORDER BY ord),'[]'::jsonb)
    FROM jsonb_array_elements(p_candidates) WITH ORDINALITY candidate(item,ord)
    WHERE EXISTS (SELECT 1 FROM public.guests g WHERE g.invitation_id=p_invitation_id
      AND regexp_replace(public.enkarta_roster_text(g.name),'\s+',' ','g')=regexp_replace(public.enkarta_roster_text(item->>'name'),'\s+',' ','g')
      AND public.enkarta_roster_phone(g.guest_metadata->>'phone')=public.enkarta_roster_phone(item->>'phone')));
END; $$;

REVOKE ALL ON FUNCTION public.enkarta_roster_text(text),public.enkarta_roster_phone(text),public.enkarta_roster_sort(text),
  public.enkarta_host_roster(uuid,jsonb,integer,integer,uuid[],boolean,boolean),public.enkarta_roster_duplicates(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_roster_text(text),public.enkarta_roster_phone(text),public.enkarta_roster_sort(text),
  public.enkarta_host_roster(uuid,jsonb,integer,integer,uuid[],boolean,boolean),public.enkarta_roster_duplicates(uuid,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;

SELECT to_regprocedure('public.enkarta_host_roster(uuid,jsonb,integer,integer,uuid[],boolean,boolean)') IS NOT NULL
  AND to_regprocedure('public.enkarta_roster_duplicates(uuid,jsonb)') IS NOT NULL
  AND NOT has_function_privilege('anon','public.enkarta_host_roster(uuid,jsonb,integer,integer,uuid[],boolean,boolean)','EXECUTE')
  AND NOT has_function_privilege('authenticated','public.enkarta_host_roster(uuid,jsonb,integer,integer,uuid[],boolean,boolean)','EXECUTE')
  AND has_function_privilege('service_role','public.enkarta_host_roster(uuid,jsonb,integer,integer,uuid[],boolean,boolean)','EXECUTE')
  AS host_roster_pagination_ready;
