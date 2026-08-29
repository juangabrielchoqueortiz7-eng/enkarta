-- Servicios, fase 4. Ejecutar COMPLETA después de 006, 007 y 008.
-- No acorta plazos anteriores, no cambia estados ni elimina información.
BEGIN;

ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS validity_mode text NOT NULL DEFAULT 'legacy'
  CHECK (validity_mode IN ('legacy', 'automatic'));
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS validity_extra_days integer NOT NULL DEFAULT 0
  CHECK (validity_extra_days BETWEEN 0 AND 36500);
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS validity_revision integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.invitation_validity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('activate', 'extend', 'set_expiry', 'recalculate')),
  days integer,
  requested_expires_at date,
  reason text NOT NULL CHECK (length(reason) BETWEEN 3 AND 300),
  before_expires_at date, after_expires_at date,
  before_revision integer NOT NULL, after_revision integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
CREATE INDEX IF NOT EXISTS invitation_validity_events_history
  ON public.invitation_validity_events(invitation_id, after_revision DESC);
ALTER TABLE public.invitation_validity_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invitation_validity_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.invitation_validity_events TO service_role;

-- Refleja PACKAGE_CATALOG. La prueba compara ambos para evitar divergencias.
CREATE OR REPLACE FUNCTION public.enkarta_package_days(p_config jsonb)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE WHEN p_config #>> '{serviceContract,version}' = '2' THEN
    CASE p_config ->> 'package' WHEN 'plus' THEN 30 WHEN 'premium' THEN 60 WHEN 'exclusive' THEN 90 END
  END;
$$;

-- La base es quien calcula el vencimiento: también cubre importaciones y bots.
-- UPDATE nunca adopta automáticamente las condiciones de un contrato anterior.
CREATE OR REPLACE FUNCTION public.enkarta_compute_validity() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE base_days integer := public.enkarta_package_days(NEW.builder_config::jsonb);
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.validity_revision := 0;
    NEW.validity_extra_days := 0;
    IF base_days IS NOT NULL THEN NEW.validity_mode := 'automatic'; END IF;
  END IF;
  IF NEW.validity_mode = 'automatic' THEN
    IF base_days IS NULL THEN RAISE EXCEPTION 'VALIDITY_CONTRACT_REQUIRED'; END IF;
    IF NEW.event_date IS NULL AND NEW.status = 'ready' THEN RAISE EXCEPTION 'VALIDITY_EVENT_REQUIRED'; END IF;
    NEW.expires_at := NEW.event_date + base_days + NEW.validity_extra_days;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.validity_revision := OLD.validity_revision;
    IF (NEW.event_date, base_days, NEW.validity_mode, NEW.validity_extra_days, NEW.expires_at)
       IS DISTINCT FROM (OLD.event_date, public.enkarta_package_days(OLD.builder_config::jsonb), OLD.validity_mode, OLD.validity_extra_days, OLD.expires_at) THEN
      NEW.validity_revision := OLD.validity_revision + 1;
    END IF;
    IF OLD.validity_mode = 'automatic' AND NEW.validity_mode = 'automatic'
       AND (NEW.event_date, base_days) IS DISTINCT FROM (OLD.event_date, public.enkarta_package_days(OLD.builder_config::jsonb)) THEN
      INSERT INTO public.invitation_validity_events(invitation_id, action, reason, before_expires_at, after_expires_at, before_revision, after_revision)
      VALUES (NEW.id, 'recalculate', 'Fecha del evento o paquete actualizado', OLD.expires_at, NEW.expires_at, OLD.validity_revision, NEW.validity_revision);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enkarta_compute_validity ON public.invitations;
CREATE TRIGGER enkarta_compute_validity BEFORE INSERT OR UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.enkarta_compute_validity();

-- Cambio + auditoría en UNA transacción, con bloqueo de la invitación, revisión
-- e idempotencia. No cambia is_active/status ni toca invitados, respuestas o QR.
CREATE OR REPLACE FUNCTION public.enkarta_change_validity(
  p_id uuid, p_action text, p_days integer, p_expires_at date, p_reason text,
  p_expected_revision integer, p_request_id uuid
) RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE inv public.invitations%ROWTYPE; changed public.invitations%ROWTYPE;
  previous public.invitation_validity_events%ROWTYPE; base_days integer; extra integer;
BEGIN
  IF p_request_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision < 0
    OR p_action IS NULL OR p_action NOT IN ('activate', 'extend', 'set_expiry')
    OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 3 AND 300
    OR (p_action = 'extend' AND (p_days IS NULL OR p_days NOT BETWEEN 1 AND 3650))
    OR (p_action <> 'extend' AND p_days IS NOT NULL)
    OR (p_action <> 'set_expiry' AND p_expires_at IS NOT NULL) THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  SELECT * INTO inv FROM public.invitations WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT * INTO previous FROM public.invitation_validity_events WHERE id = p_request_id;
  IF FOUND THEN
    IF (previous.invitation_id, previous.action, previous.days, previous.requested_expires_at, previous.reason, previous.before_revision)
       IS DISTINCT FROM (p_id, p_action, p_days, p_expires_at, trim(p_reason), p_expected_revision) THEN RAISE EXCEPTION 'REQUEST_REUSED'; END IF;
    RETURN jsonb_build_object('replayed', true);
  END IF;
  IF inv.validity_revision <> p_expected_revision THEN RAISE EXCEPTION 'STALE_VALIDITY'; END IF;
  IF p_action = 'activate' THEN
    IF inv.validity_mode = 'automatic' THEN RAISE EXCEPTION 'VALIDITY_ALREADY_AUTOMATIC'; END IF;
    base_days := public.enkarta_package_days(inv.builder_config::jsonb);
    IF base_days IS NULL THEN RAISE EXCEPTION 'VALIDITY_CONTRACT_REQUIRED'; END IF;
    IF inv.event_date IS NULL THEN RAISE EXCEPTION 'VALIDITY_EVENT_REQUIRED'; END IF;
    -- Respeta una fecha anterior acordada que sea MÁS larga que el paquete.
    extra := greatest(0, coalesce(inv.expires_at - (inv.event_date + base_days), 0));
    UPDATE public.invitations SET validity_mode = 'automatic', validity_extra_days = extra WHERE id = p_id RETURNING * INTO changed;
  ELSIF p_action = 'extend' THEN
    IF inv.expires_at IS NULL THEN RAISE EXCEPTION 'VALIDITY_DATE_REQUIRED'; END IF;
    IF inv.validity_mode = 'automatic' THEN
      IF inv.validity_extra_days + p_days > 36500 THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
      UPDATE public.invitations SET validity_extra_days = inv.validity_extra_days + p_days WHERE id = p_id RETURNING * INTO changed;
    ELSE
      UPDATE public.invitations SET expires_at = inv.expires_at + p_days WHERE id = p_id RETURNING * INTO changed;
    END IF;
  ELSE
    IF inv.validity_mode <> 'legacy' THEN RAISE EXCEPTION 'VALIDITY_AUTOMATIC'; END IF;
    IF p_expires_at IS NOT NULL AND p_expires_at < inv.event_date THEN RAISE EXCEPTION 'VALIDITY_BEFORE_EVENT'; END IF;
    IF p_expires_at IS NOT DISTINCT FROM inv.expires_at THEN RAISE EXCEPTION 'VALIDITY_NO_CHANGE'; END IF;
    UPDATE public.invitations SET expires_at = p_expires_at WHERE id = p_id RETURNING * INTO changed;
  END IF;
  INSERT INTO public.invitation_validity_events(id, invitation_id, action, days, requested_expires_at, reason,
    before_expires_at, after_expires_at, before_revision, after_revision)
  VALUES (p_request_id, p_id, p_action, p_days, p_expires_at, trim(p_reason), inv.expires_at, changed.expires_at, inv.validity_revision, changed.validity_revision);
  RETURN jsonb_build_object('replayed', false);
END;
$$;

-- Un plazo pendiente nunca se interpreta como acceso indefinido por un snapshot.
-- Conserva la función transaccional de 006 bajo una comprobación adicional.
-- CREATE OR REPLACE de la función base, sin wrappers/renames al reaplicar.
CREATE OR REPLACE FUNCTION public.enkarta_assert_event_open(p_id uuid, p_deadline boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE inv public.invitations%ROWTYPE; published boolean := false; version record; due timestamptz;
  today date := (statement_timestamp() AT TIME ZONE 'America/La_Paz')::date;
BEGIN
  SELECT * INTO inv FROM public.invitations WHERE id = p_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF inv.is_active = false OR inv.status IN ('disabled', 'expired') OR inv.expires_at < today
     OR (inv.validity_mode = 'automatic' AND inv.expires_at IS NULL) THEN RAISE EXCEPTION 'EVENT_CLOSED'; END IF;
  IF inv.status <> 'ready' THEN
    FOR version IN SELECT snapshot, created_at FROM public.builder_versions
      WHERE invitation_id = p_id AND source = 'publish' ORDER BY created_at DESC LIMIT 30 LOOP
      due := version.created_at;
      IF version.snapshot #>> '{config,__enkartaVersion,publicationState}' = 'scheduled' THEN
        BEGIN due := (version.snapshot #>> '{config,__enkartaVersion,publishAt}')::timestamptz;
        EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN due := NULL;
        END;
      END IF;
      IF due <= statement_timestamp() THEN published := true; EXIT; END IF;
    END LOOP;
    IF NOT published THEN RAISE EXCEPTION 'EVENT_CLOSED'; END IF;
  END IF;
  IF p_deadline AND inv.rsvp_deadline < today THEN RAISE EXCEPTION 'RSVP_CLOSED'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.enkarta_package_days(jsonb), public.enkarta_compute_validity(),
  public.enkarta_change_validity(uuid,text,integer,date,text,integer,uuid), public.enkarta_assert_event_open(uuid,boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_package_days(jsonb), public.enkarta_compute_validity(),
  public.enkarta_change_validity(uuid,text,integer,date,text,integer,uuid), public.enkarta_assert_event_open(uuid,boolean) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
