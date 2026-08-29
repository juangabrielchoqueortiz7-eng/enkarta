-- Servicios, fase 5. Ejecutar completa después de 009. Reaplicable y sin borrados.
BEGIN;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'pending'
  CHECK (delivery_status IN ('pending','opened','marked'));
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS whatsapp_opened_at timestamptz;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS manually_marked_at timestamptz;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0 CHECK (reminder_count BETWEEN 0 AND 10000);
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_delivery_request uuid;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_delivery_action text;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_delivery_expected_revision integer;
UPDATE public.guests SET delivery_status='marked', manually_marked_at=coalesce(manually_marked_at,created_at)
  WHERE sent=true AND delivery_status='pending';

CREATE OR REPLACE FUNCTION public.enkarta_guest_delivery_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
  IF (NEW.sent,NEW.allow_kids,NEW.delivery_status,NEW.whatsapp_opened_at,NEW.manually_marked_at,NEW.last_reminder_at,NEW.reminder_count,NEW.last_delivery_request,NEW.last_delivery_expected_revision)
    IS DISTINCT FROM (OLD.sent,OLD.allow_kids,OLD.delivery_status,OLD.whatsapp_opened_at,OLD.manually_marked_at,OLD.last_reminder_at,OLD.reminder_count,OLD.last_delivery_request,OLD.last_delivery_expected_revision)
    AND NEW.response_revision=OLD.response_revision THEN NEW.response_revision:=OLD.response_revision+1; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS enkarta_guest_delivery_revision ON public.guests;
CREATE TRIGGER enkarta_guest_delivery_revision BEFORE UPDATE ON public.guests FOR EACH ROW EXECUTE FUNCTION public.enkarta_guest_delivery_revision();

CREATE OR REPLACE FUNCTION public.enkarta_record_delivery(p_guest_id uuid,p_action text,p_expected_revision integer,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE g public.guests%ROWTYPE; changed public.guests%ROWTYPE;
BEGIN
 IF p_request_id IS NULL OR p_expected_revision<0 OR p_action NOT IN ('opened','manual','reminder') THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
 SELECT * INTO g FROM public.guests WHERE id=p_guest_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 IF g.last_delivery_request=p_request_id THEN
   IF g.last_delivery_action<>p_action OR g.last_delivery_expected_revision<>p_expected_revision THEN RAISE EXCEPTION 'REQUEST_REUSED'; END IF;
   RETURN jsonb_build_object('guest',to_jsonb(g),'replayed',true);
 END IF;
 IF g.response_revision<>p_expected_revision THEN RAISE EXCEPTION 'STALE_GUEST'; END IF;
 IF p_action='reminder' AND g.status<>'pending' THEN RAISE EXCEPTION 'REMINDER_NOT_NEEDED'; END IF;
 UPDATE public.guests SET
   delivery_status=CASE WHEN p_action='manual' THEN 'marked' WHEN p_action='opened' AND delivery_status='pending' THEN 'opened' ELSE delivery_status END,
   sent=CASE WHEN p_action='manual' THEN true ELSE sent END,
   whatsapp_opened_at=CASE WHEN p_action='opened' THEN coalesce(whatsapp_opened_at,statement_timestamp()) ELSE whatsapp_opened_at END,
   manually_marked_at=CASE WHEN p_action='manual' THEN coalesce(manually_marked_at,statement_timestamp()) ELSE manually_marked_at END,
   last_reminder_at=CASE WHEN p_action='reminder' THEN statement_timestamp() ELSE last_reminder_at END,
   reminder_count=reminder_count+CASE WHEN p_action='reminder' THEN 1 ELSE 0 END,
   last_delivery_request=p_request_id,last_delivery_action=p_action,last_delivery_expected_revision=p_expected_revision
 WHERE id=p_guest_id RETURNING * INTO changed;
 RETURN jsonb_build_object('guest',to_jsonb(changed),'replayed',false);
END; $$;
REVOKE ALL ON FUNCTION public.enkarta_record_delivery(uuid,text,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_record_delivery(uuid,text,integer,uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
