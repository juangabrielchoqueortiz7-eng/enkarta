-- Fase 1 de servicios: RSVP y acceso transaccionales. Aplicar antes del código.
-- Requiere 001–004 y las columnas operativas existentes de invitations.
-- No elimina respuestas, asientos ni bitácoras. Ejecutar con respaldo previo.
BEGIN;

ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS expires_at date;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS response_revision integer NOT NULL DEFAULT 0;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_response_request uuid;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
ALTER TABLE public.rsvps ADD COLUMN IF NOT EXISTS receipt_hash text;
ALTER TABLE public.rsvps ADD COLUMN IF NOT EXISTS response_revision integer NOT NULL DEFAULT 0;
ALTER TABLE public.rsvps ADD COLUMN IF NOT EXISTS last_response_request uuid;
ALTER TABLE public.access_log ADD COLUMN IF NOT EXISTS request_id uuid;
ALTER TABLE public.access_log ADD COLUMN IF NOT EXISTS before_revision integer;
ALTER TABLE public.access_log ADD COLUMN IF NOT EXISTS operator text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvps_receipt ON public.rsvps(invitation_id, receipt_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_log_request ON public.access_log(request_id) WHERE request_id IS NOT NULL;

-- Las políticas de 001/002 llamadas "Service role" no restringían el rol.
-- La aplicación consulta estas tablas desde el servidor, nunca desde el cliente.
DROP POLICY IF EXISTS "Service role has full access" ON public.invitations;
DROP POLICY IF EXISTS "Public can view ready invitations" ON public.invitations;
DROP POLICY IF EXISTS "Service role full access guests" ON public.guests;
DROP POLICY IF EXISTS "Service role full access attendees" ON public.attendees;
DROP POLICY IF EXISTS "Service role full access acceslog" ON public.access_log;
REVOKE ALL ON public.invitations, public.guests, public.attendees, public.access_log, public.rsvps FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations, public.guests, public.attendees, public.access_log, public.rsvps TO service_role;

-- Cerramos cambios administrativos que invalidarían confirmaciones o historia.
CREATE OR REPLACE FUNCTION public.enkarta_guard_guest_changes() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE used_seat integer;
BEGIN
  SELECT coalesce(max(seat_no), 0) INTO used_seat FROM public.attendees
    WHERE guest_id = OLD.id AND (checked_in_at IS NOT NULL OR state = 'in');
  IF TG_OP = 'DELETE' THEN
    IF used_seat > 0 THEN RAISE EXCEPTION 'USED_PASSES'; END IF;
    RETURN OLD;
  END IF;
  IF (NEW.name, NEW.passes, NEW.status, NEW.confirmed_passes, NEW.confirm_name, NEW.message, NEW.table_no)
     IS DISTINCT FROM (OLD.name, OLD.passes, OLD.status, OLD.confirmed_passes, OLD.confirm_name, OLD.message, OLD.table_no) THEN
    IF NEW.passes NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'INVALID_PASSES'; END IF;
    IF NEW.status = 'confirmed' AND coalesce(NEW.confirmed_passes, NEW.passes) NOT BETWEEN 1 AND NEW.passes THEN
      RAISE EXCEPTION 'CONFIRMED_LIMIT';
    END IF;
    IF used_seat > (CASE WHEN NEW.status = 'confirmed' THEN coalesce(NEW.confirmed_passes, NEW.passes) ELSE 0 END) THEN
      RAISE EXCEPTION 'USED_PASSES';
    END IF;
    NEW.response_revision := OLD.response_revision + 1;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enkarta_guard_guest_changes ON public.guests;
CREATE TRIGGER enkarta_guard_guest_changes BEFORE UPDATE OR DELETE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.enkarta_guard_guest_changes();

-- Mismo criterio que el publicador: borrador con un snapshot ya publicado sigue
-- público; una programación futura NO habilita RSVP. Fechas inclusivas, Bolivia.
CREATE OR REPLACE FUNCTION public.enkarta_assert_event_open(p_id uuid, p_deadline boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE inv public.invitations%ROWTYPE; published boolean := false; version record; due timestamptz;
  today date := (statement_timestamp() AT TIME ZONE 'America/La_Paz')::date;
BEGIN
  SELECT * INTO inv FROM public.invitations WHERE id = p_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF inv.is_active = false OR inv.status IN ('disabled', 'expired') OR inv.expires_at < today THEN
    RAISE EXCEPTION 'EVENT_CLOSED';
  END IF;
  IF inv.status <> 'ready' THEN
    FOR version IN SELECT snapshot, created_at FROM public.builder_versions
      WHERE invitation_id = p_id AND source = 'publish' ORDER BY created_at DESC LIMIT 30 LOOP
      due := version.created_at;
      IF version.snapshot #>> '{config,__enkartaVersion,publicationState}' = 'scheduled' THEN
        BEGIN
          due := (version.snapshot #>> '{config,__enkartaVersion,publishAt}')::timestamptz;
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

-- Lectura común para los dos formularios. El recibo abierto solo viene de una
-- cookie HttpOnly; no se busca por nombre ni se revela la respuesta de otro.
CREATE OR REPLACE FUNCTION public.enkarta_rsvp_state(p_slug text, p_public_id text DEFAULT NULL, p_receipt_hash text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE inv_id uuid; g public.guests%ROWTYPE; r public.rsvps%ROWTYPE; closed text; used boolean := false;
BEGIN
  SELECT id INTO inv_id FROM public.invitations WHERE slug = p_slug;
  IF inv_id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  BEGIN PERFORM public.enkarta_assert_event_open(inv_id, false);
  EXCEPTION WHEN raise_exception THEN RETURN jsonb_build_object('canRespond', false, 'closedCode', SQLERRM); END;
  BEGIN PERFORM public.enkarta_assert_event_open(inv_id, true);
  EXCEPTION WHEN raise_exception THEN closed := SQLERRM; END;
  IF p_public_id IS NOT NULL THEN
    SELECT * INTO g FROM public.guests WHERE invitation_id = inv_id AND public_id = p_public_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
    SELECT EXISTS(SELECT 1 FROM public.attendees WHERE guest_id = g.id AND (checked_in_at IS NOT NULL OR state = 'in')) INTO used;
    RETURN jsonb_build_object('canRespond', closed IS NULL, 'closedCode', closed, 'guest', to_jsonb(g), 'hasUsedPasses', used);
  END IF;
  SELECT * INTO r FROM public.rsvps WHERE invitation_id = inv_id AND receipt_hash = p_receipt_hash;
  RETURN jsonb_build_object('canRespond', closed IS NULL, 'closedCode', closed,
    'entry', CASE WHEN r.id IS NULL THEN NULL ELSE to_jsonb(r) - 'receipt_hash' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.enkarta_confirm_guest(
  p_slug text, p_public_id text, p_attending text, p_passes integer, p_name text, p_message text,
  p_request_id uuid, p_expected_revision integer, p_token text, p_code text
) RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE inv_id uuid; g public.guests%ROWTYPE; new_status text; seats integer; used_seat integer;
BEGIN
  IF p_request_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision < 0 OR p_attending IS NULL OR p_attending NOT IN ('yes','no') OR nullif(btrim(p_name),'') IS NULL THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  SELECT id INTO inv_id FROM public.invitations WHERE slug = p_slug;
  PERFORM public.enkarta_assert_event_open(inv_id);
  SELECT * INTO g FROM public.guests WHERE invitation_id = inv_id AND public_id = p_public_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  new_status := CASE WHEN p_attending = 'yes' THEN 'confirmed' ELSE 'declined' END;
  seats := CASE WHEN p_attending = 'yes' THEN p_passes ELSE 0 END;
  IF seats IS NULL OR (p_attending = 'yes' AND seats NOT BETWEEN 1 AND g.passes) THEN RAISE EXCEPTION 'INVALID_PASSES'; END IF;
  IF g.last_response_request = p_request_id THEN
    IF (g.status, g.confirmed_passes, g.confirm_name, g.message) IS DISTINCT FROM
       (new_status, seats, left(btrim(p_name),120), nullif(left(btrim(coalesce(p_message,'')),400),'')) THEN RAISE EXCEPTION 'REQUEST_REUSED'; END IF;
    RETURN jsonb_build_object('guest', to_jsonb(g), 'replayed', true);
  END IF;
  IF g.response_revision <> p_expected_revision THEN RAISE EXCEPTION 'STALE_RESPONSE'; END IF;
  SELECT coalesce(max(seat_no),0) INTO used_seat FROM public.attendees WHERE guest_id = g.id AND (checked_in_at IS NOT NULL OR state = 'in');
  IF seats < used_seat THEN RAISE EXCEPTION 'USED_PASSES'; END IF;
  IF new_status = 'confirmed' AND (nullif(p_token,'') IS NULL OR nullif(p_code,'') IS NULL) THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  UPDATE public.guests SET status = new_status, confirmed_passes = seats,
    confirm_name = left(btrim(p_name),120), message = nullif(left(btrim(coalesce(p_message,'')),400),''),
    responded_at = statement_timestamp(), last_response_request = p_request_id,
    response_revision = response_revision + 1,
    access_token = CASE WHEN new_status = 'confirmed' THEN coalesce(access_token,p_token) ELSE access_token END,
    access_code = CASE WHEN new_status = 'confirmed' THEN coalesce(access_code,p_code) ELSE access_code END
    WHERE id = g.id RETURNING * INTO g;
  INSERT INTO public.attendees(guest_id,seat_no)
    SELECT g.id, s FROM generate_series(1,seats) AS s ON CONFLICT(guest_id,seat_no) DO NOTHING;
  -- Los asientos sobrantes se conservan: el escáner los excluye, sin borrar historial.
  RETURN jsonb_build_object('guest',to_jsonb(g),'replayed',false);
END;
$$;

CREATE OR REPLACE FUNCTION public.enkarta_submit_open_rsvp(
  p_slug text, p_receipt_hash text, p_attending text, p_passes integer, p_name text, p_message text,
  p_request_id uuid, p_expected_revision integer
) RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE inv_id uuid; r public.rsvps%ROWTYPE; seats integer;
BEGIN
  IF p_request_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision < 0 OR p_receipt_hash IS NULL OR p_receipt_hash !~ '^[a-f0-9]{64}$' OR
    p_attending IS NULL OR p_attending NOT IN ('yes','no') OR nullif(btrim(p_name),'') IS NULL THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  seats := CASE WHEN p_attending = 'yes' THEN p_passes ELSE 0 END;
  IF seats IS NULL OR (p_attending = 'yes' AND seats NOT BETWEEN 1 AND 20) THEN RAISE EXCEPTION 'INVALID_PASSES'; END IF;
  SELECT id INTO inv_id FROM public.invitations WHERE slug = p_slug;
  PERFORM public.enkarta_assert_event_open(inv_id);
  -- Serializa también la primera respuesta, cuando aún no hay fila que bloquear.
  PERFORM pg_advisory_xact_lock(hashtextextended(inv_id::text || p_receipt_hash, 0));
  SELECT * INTO r FROM public.rsvps WHERE invitation_id = inv_id AND receipt_hash = p_receipt_hash FOR UPDATE;
  IF r.last_response_request = p_request_id THEN
    IF (r.attending,r.passes,r.name,r.message) IS DISTINCT FROM (p_attending,seats,left(btrim(p_name),80),left(btrim(coalesce(p_message,'')),400)) THEN RAISE EXCEPTION 'REQUEST_REUSED'; END IF;
    RETURN jsonb_build_object('entry',to_jsonb(r) - 'receipt_hash','replayed',true);
  END IF;
  IF coalesce(r.response_revision,0) <> p_expected_revision THEN RAISE EXCEPTION 'STALE_RESPONSE'; END IF;
  IF r.id IS NULL THEN
    INSERT INTO public.rsvps(id,invitation_id,receipt_hash,name,attending,passes,message,response_revision,last_response_request)
    VALUES ('r-' || gen_random_uuid()::text,inv_id,p_receipt_hash,left(btrim(p_name),80),p_attending,seats,left(btrim(coalesce(p_message,'')),400),1,p_request_id) RETURNING * INTO r;
  ELSE
    UPDATE public.rsvps SET name=left(btrim(p_name),80), attending=p_attending, passes=seats,
      message=left(btrim(coalesce(p_message,'')),400), at=statement_timestamp(), response_revision=response_revision+1,
      last_response_request=p_request_id WHERE id=r.id RETURNING * INTO r;
  END IF;
  RETURN jsonb_build_object('entry',to_jsonb(r) - 'receipt_hash','replayed',false);
END;
$$;

-- Completar asientos históricos confirmados sin borrar ni reiniciar ninguno.
INSERT INTO public.attendees(guest_id,seat_no)
SELECT g.id,s FROM public.guests g CROSS JOIN LATERAL generate_series(1,least(20,greatest(0,coalesce(g.confirmed_passes,g.passes)))) s
WHERE g.status='confirmed' ON CONFLICT(guest_id,seat_no) DO NOTHING;

CREATE OR REPLACE FUNCTION public.enkarta_checkin_group(p_invitation_id uuid, p_guest_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE g public.guests%ROWTYPE; seats jsonb;
BEGIN
  PERFORM public.enkarta_assert_event_open(p_invitation_id,false);
  SELECT * INTO g FROM public.guests WHERE id=p_guest_id AND invitation_id=p_invitation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF g.status <> 'confirmed' THEN RAISE EXCEPTION 'NOT_CONFIRMED'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY seat_no),'[]'::jsonb) INTO seats FROM public.attendees a
    WHERE guest_id=g.id AND (seat_no <= least(g.passes,coalesce(g.confirmed_passes,g.passes)) OR state='in');
  RETURN jsonb_build_object('guest',to_jsonb(g),'attendees',seats);
END;
$$;

CREATE OR REPLACE FUNCTION public.enkarta_checkin(
  p_invitation_id uuid, p_attendee_id uuid, p_action text, p_expected_revision integer, p_request_id uuid, p_operator text
) RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE g public.guests%ROWTYPE; a public.attendees%ROWTYPE; guest_id_value uuid; prior public.access_log%ROWTYPE;
BEGIN
  IF p_request_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision < 0 OR p_action IS NULL OR p_action NOT IN ('in','out') OR nullif(p_operator,'') IS NULL THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  PERFORM public.enkarta_assert_event_open(p_invitation_id,false);
  SELECT guest_id INTO guest_id_value FROM public.attendees WHERE id=p_attendee_id;
  -- Orden único de locks: invitación → invitado → asiento. RSVP usa el mismo orden.
  SELECT * INTO g FROM public.guests WHERE id=guest_id_value AND invitation_id=p_invitation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT * INTO a FROM public.attendees WHERE id=p_attendee_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT * INTO prior FROM public.access_log WHERE request_id=p_request_id;
  IF FOUND THEN
    IF prior.attendee_id<>p_attendee_id OR prior.action<>p_action OR prior.before_revision<>p_expected_revision THEN RAISE EXCEPTION 'REQUEST_REUSED'; END IF;
    RETURN jsonb_build_object('attendee',to_jsonb(a),'replayed',true);
  END IF;
  IF a.revision<>p_expected_revision THEN RAISE EXCEPTION 'STALE_SCAN'; END IF;
  IF a.state=p_action THEN RAISE EXCEPTION 'DUPLICATE_SCAN'; END IF;
  IF p_action='in' AND (g.status<>'confirmed' OR a.seat_no>least(g.passes,coalesce(g.confirmed_passes,g.passes))) THEN RAISE EXCEPTION 'NOT_CONFIRMED'; END IF;
  UPDATE public.attendees SET state=p_action, revision=revision+1,
    checked_in_at=CASE WHEN p_action='in' THEN statement_timestamp() ELSE checked_in_at END,
    checked_out_at=CASE WHEN p_action='out' THEN statement_timestamp() ELSE checked_out_at END
    WHERE id=p_attendee_id RETURNING * INTO a;
  INSERT INTO public.access_log(guest_id,attendee_id,action,request_id,before_revision,operator)
    VALUES(g.id,a.id,p_action,p_request_id,p_expected_revision,left(p_operator,100));
  RETURN jsonb_build_object('attendee',to_jsonb(a),'replayed',false);
END;
$$;

-- Funciones INVOKER, sin privilegios elevados; solo las APIs autenticadas usan
-- service_role. Revocar EXECUTE por defecto evita saltarse sus comprobaciones.
REVOKE ALL ON FUNCTION public.enkarta_guard_guest_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enkarta_assert_event_open(uuid,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enkarta_rsvp_state(text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enkarta_confirm_guest(text,text,text,integer,text,text,uuid,integer,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enkarta_submit_open_rsvp(text,text,text,integer,text,text,uuid,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enkarta_checkin_group(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enkarta_checkin(uuid,uuid,text,integer,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_guard_guest_changes(), public.enkarta_assert_event_open(uuid,boolean), public.enkarta_rsvp_state(text,text,text),
  public.enkarta_confirm_guest(text,text,text,integer,text,text,uuid,integer,text,text),
  public.enkarta_submit_open_rsvp(text,text,text,integer,text,text,uuid,integer),
  public.enkarta_checkin_group(uuid,uuid), public.enkarta_checkin(uuid,uuid,text,integer,uuid,text) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
