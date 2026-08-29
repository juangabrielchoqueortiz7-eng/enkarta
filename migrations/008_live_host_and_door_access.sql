-- Fase 3 de servicios. Ejecutar completa después de 001–004, 006 y 007.
-- No elimina registros ni cambia credenciales existentes. Reaplicable.
BEGIN;

ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS door_email text;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS door_password_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS invitations_door_email_unique
  ON public.invitations (lower(door_email)) WHERE door_email IS NOT NULL;

-- Una única sentencia lee respuestas y ocupación desde el mismo snapshot.
-- INVOKER, sin privilegios elevados. Solo la API autenticada usa service_role.
CREATE OR REPLACE FUNCTION public.enkarta_host_snapshot(p_invitation_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'syncedAt', statement_timestamp(),
    'guests', coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.created_at, g.id)
      FROM public.guests g WHERE g.invitation_id = p_invitation_id), '[]'::jsonb),
    'rsvps', coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.at, r.id)
      FROM public.rsvps r WHERE r.invitation_id = p_invitation_id), '[]'::jsonb),
    'occupancy', coalesce((SELECT jsonb_agg(to_jsonb(o)) FROM (
      SELECT a.guest_id, count(*) FILTER (WHERE a.state = 'in')::integer AS inside
      FROM public.attendees a JOIN public.guests g ON g.id = a.guest_id
      WHERE g.invitation_id = p_invitation_id GROUP BY a.guest_id
    ) o), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.enkarta_host_snapshot(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_host_snapshot(uuid) TO service_role;

-- Envío y niños también forman parte de una edición del anfitrión. El guard
-- de 006 incrementa la revisión de nombre/pases/mesa; no duplicar ese incremento.
CREATE OR REPLACE FUNCTION public.enkarta_guest_delivery_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (NEW.sent, NEW.allow_kids) IS DISTINCT FROM (OLD.sent, OLD.allow_kids)
     AND NEW.response_revision = OLD.response_revision THEN
    NEW.response_revision := OLD.response_revision + 1;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enkarta_guest_delivery_revision ON public.guests;
CREATE TRIGGER enkarta_guest_delivery_revision BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.enkarta_guest_delivery_revision();
REVOKE ALL ON FUNCTION public.enkarta_guest_delivery_revision() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_guest_delivery_revision() TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
