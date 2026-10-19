-- Seguimiento comercial transaccional y recuperable. Ejecutar completa después de 012.
-- Reaplicable: conserva contactos, atribución e historial. No modifica invitaciones ni pagos.
BEGIN;

ALTER TABLE public.commercial_leads ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.commercial_leads'::regclass
    AND conname='commercial_leads_revision_nonnegative') THEN
    ALTER TABLE public.commercial_leads ADD CONSTRAINT commercial_leads_revision_nonnegative CHECK (revision >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.commercial_lead_update_requests (
  request_id uuid PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.commercial_leads(id) ON DELETE CASCADE,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
  result jsonb NOT NULL CHECK (jsonb_typeof(result)='object'),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
CREATE INDEX IF NOT EXISTS commercial_lead_update_requests_lead
  ON public.commercial_lead_update_requests(lead_id,created_at DESC);
ALTER TABLE public.commercial_lead_update_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commercial_lead_update_requests, public.commercial_leads, public.commercial_lead_history
  FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.commercial_lead_update_requests TO service_role;

-- También detecta escrituras de la API anterior durante la transición. La revisión
-- no puede alterarse sin cambiar el seguimiento, ni volver atrás con un UPDATE.
CREATE OR REPLACE FUNCTION public.enkarta_guard_commercial_lead_revision()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF (NEW.status,NEW.revenue_bs,NEW.notes) IS DISTINCT FROM (OLD.status,OLD.revenue_bs,OLD.notes) THEN
    NEW.revision := OLD.revision + 1;
    NEW.updated_at := greatest(statement_timestamp(),OLD.updated_at + interval '1 microsecond');
  ELSE
    NEW.revision := OLD.revision;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS enkarta_guard_commercial_lead_revision ON public.commercial_leads;
CREATE TRIGGER enkarta_guard_commercial_lead_revision BEFORE UPDATE ON public.commercial_leads
  FOR EACH ROW EXECUTE FUNCTION public.enkarta_guard_commercial_lead_revision();
REVOKE ALL ON FUNCTION public.enkarta_guard_commercial_lead_revision() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_guard_commercial_lead_revision() TO service_role;

-- Lista explícita: un recibo nunca almacena ni devuelve session_hash, rutas ni
-- otros datos privados añadidos a la tabla en futuras migraciones.
CREATE OR REPLACE FUNCTION public.enkarta_commercial_lead_snapshot(p_lead public.commercial_leads)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT jsonb_build_object('id',p_lead.id,'reference',p_lead.reference,'status',p_lead.status,
    'package_key',p_lead.package_key,'design',p_lead.design,'event_category',p_lead.event_category,
    'placement',p_lead.placement,'utm_source',p_lead.utm_source,'utm_medium',p_lead.utm_medium,
    'utm_campaign',p_lead.utm_campaign,'referrer_host',p_lead.referrer_host,'revenue_bs',p_lead.revenue_bs,
    'notes',p_lead.notes,'created_at',p_lead.created_at,'updated_at',p_lead.updated_at,'revision',p_lead.revision);
$$;
REVOKE ALL ON FUNCTION public.enkarta_commercial_lead_snapshot(public.commercial_leads) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_commercial_lead_snapshot(public.commercial_leads) TO service_role;

CREATE OR REPLACE FUNCTION public.enkarta_update_commercial_lead(
  p_lead_id uuid,p_request_id uuid,p_expected_revision integer,p_status text,p_revenue_bs numeric,p_notes text
) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE
  lead public.commercial_leads%ROWTYPE;
  prior public.commercial_lead_update_requests%ROWTYPE;
  request_payload jsonb;
  receipt jsonb;
  old_status text;
BEGIN
  IF p_lead_id IS NULL OR p_request_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision < 0
    OR p_status IS NULL OR p_status NOT IN ('whatsapp_open','contacted','reserved','won','lost')
    OR p_notes IS NULL OR char_length(p_notes)>1000
    OR (p_revenue_bs IS NOT NULL AND (p_revenue_bs<0 OR p_revenue_bs>1000000 OR trunc(p_revenue_bs,2)<>p_revenue_bs))
  THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  request_payload := jsonb_build_object('leadId',p_lead_id,'expectedRevision',p_expected_revision,
    'status',p_status,'revenueBs',p_revenue_bs,'notes',p_notes);

  -- Mismo requestId, incluso contra otro contacto, espera la misma operación.
  -- El lock precede al contacto. No se inserta una fila provisional con FK que
  -- obligaría a convertir bloqueos compartidos de dos escritores simultáneos.
  PERFORM pg_advisory_xact_lock(hashtextextended('enkarta-commercial-update:' || p_request_id::text,0));
  SELECT * INTO prior FROM public.commercial_lead_update_requests WHERE request_id=p_request_id;
  IF FOUND THEN
    IF prior.payload IS DISTINCT FROM request_payload THEN
      RETURN jsonb_build_object('outcome','request_conflict','requestId',p_request_id,'lead',NULL);
    END IF;
    -- Conserva la foto del guardado original; nunca sustituye cambios posteriores.
    RETURN prior.result || jsonb_build_object('outcome','replayed');
  END IF;

  SELECT * INTO lead FROM public.commercial_leads WHERE id=p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('outcome','not_found','requestId',p_request_id,'lead',NULL); END IF;
  IF lead.revision<>p_expected_revision THEN
    RETURN jsonb_build_object('outcome','conflict','requestId',p_request_id,
      'lead',public.enkarta_commercial_lead_snapshot(lead));
  END IF;
  IF (lead.status,lead.revenue_bs,lead.notes) IS NOT DISTINCT FROM (p_status,p_revenue_bs,p_notes) THEN
    receipt := jsonb_build_object('outcome','unchanged','requestId',p_request_id,
      'lead',public.enkarta_commercial_lead_snapshot(lead));
  ELSE
    old_status := lead.status;
    UPDATE public.commercial_leads SET status=p_status,revenue_bs=p_revenue_bs,notes=p_notes
      WHERE id=p_lead_id RETURNING * INTO lead;
    -- Incluye limpieza de notas o importe, aunque no cambie el estado. Si el
    -- historial falla, PostgreSQL revierte contacto, revisión y recibo juntos.
    INSERT INTO public.commercial_lead_history(lead_id,from_status,to_status,revenue_bs,note)
      VALUES(lead.id,old_status,lead.status,lead.revenue_bs,lead.notes);
    receipt := jsonb_build_object('outcome','saved','requestId',p_request_id,
      'lead',public.enkarta_commercial_lead_snapshot(lead));
  END IF;
  INSERT INTO public.commercial_lead_update_requests(request_id,lead_id,payload,result)
    VALUES(p_request_id,p_lead_id,request_payload,receipt);
  RETURN receipt;
END; $$;
REVOKE ALL ON FUNCTION public.enkarta_update_commercial_lead(uuid,uuid,integer,text,numeric,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_update_commercial_lead(uuid,uuid,integer,text,numeric,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;

SELECT to_regprocedure('public.enkarta_update_commercial_lead(uuid,uuid,integer,text,numeric,text)') IS NOT NULL
  AND coalesce((SELECT relrowsecurity FROM pg_class WHERE oid='public.commercial_lead_update_requests'::regclass),false)
  AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.commercial_leads'::regclass AND attname='revision' AND attnotnull)
  AND EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.commercial_leads'::regclass
    AND tgname='enkarta_guard_commercial_lead_revision' AND tgenabled='O' AND NOT tgisinternal)
  AND NOT has_table_privilege('anon','public.commercial_lead_update_requests','SELECT')
  AND NOT has_table_privilege('authenticated','public.commercial_lead_update_requests','SELECT')
  AND NOT has_function_privilege('anon','public.enkarta_update_commercial_lead(uuid,uuid,integer,text,numeric,text)','EXECUTE')
  AND NOT has_function_privilege('authenticated','public.enkarta_update_commercial_lead(uuid,uuid,integer,text,numeric,text)','EXECUTE')
  AND has_function_privilege('service_role','public.enkarta_update_commercial_lead(uuid,uuid,integer,text,numeric,text)','EXECUTE')
  AS commercial_lead_updates_ready;
