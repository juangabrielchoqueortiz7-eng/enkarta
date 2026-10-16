-- Ejecutar completa en Supabase SQL Editor después de 015 y antes del código nuevo.
-- Aditiva y reaplicable. No elimina ni modifica diseños, snapshots, QR o pagos.
-- Conserva builder_config.guestMeta como respaldo histórico; el nuevo código
-- deja de usarlo como fuente operativa al encontrar guest_metadata.
BEGIN;

ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS guest_metadata jsonb;

-- Función temporal: no deja una RPC pública nueva. También admite configuraciones
-- antiguas almacenadas como una cadena JSON dentro de la columna JSONB.
CREATE OR REPLACE FUNCTION pg_temp.enkarta_guest_metadata_016(config jsonb, public_id text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE meta jsonb;
BEGIN
  IF jsonb_typeof(config) = 'string' THEN
    BEGIN config := (config #>> '{}')::jsonb;
    EXCEPTION WHEN invalid_text_representation THEN RETURN '{}'::jsonb; END;
  END IF;
  meta := config #> ARRAY['guestMeta', public_id];
  RETURN jsonb_strip_nulls(jsonb_build_object(
    'phone', CASE WHEN jsonb_typeof(meta->'phone') = 'string' THEN meta->'phone' END,
    'group', CASE WHEN jsonb_typeof(meta->'group') = 'string' THEN meta->'group' END,
    'eventAccess', CASE WHEN meta->>'eventAccess' IN ('both','ceremony','reception') THEN meta->'eventAccess' END
  ));
END;
$$;

-- Solo filas todavía no migradas. Reaplicar NO restaura datos antiguos sobre un
-- contacto actualizado o vaciado intencionalmente en la tabla guests.
UPDATE public.guests g
SET guest_metadata = pg_temp.enkarta_guest_metadata_016(i.builder_config, g.public_id)
FROM public.invitations i
WHERE i.id = g.invitation_id AND g.guest_metadata IS NULL;

ALTER TABLE public.guests ALTER COLUMN guest_metadata SET DEFAULT '{}'::jsonb;
ALTER TABLE public.guests ALTER COLUMN guest_metadata SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.guests'::regclass AND conname = 'guests_metadata_object') THEN
    ALTER TABLE public.guests ADD CONSTRAINT guests_metadata_object
      CHECK (jsonb_typeof(guest_metadata) = 'object');
  END IF;
END; $$;
COMMENT ON COLUMN public.guests.guest_metadata IS
  'Contacto y agrupación privados del invitado. Canónico; no restaurar desde snapshots de diseño.';

-- Mantiene todas las revisiones de 010 y añade contacto/grupo/preferencia. El
-- guard de 006 puede haber incrementado ya la revisión: nunca incrementarla dos veces.
CREATE OR REPLACE FUNCTION public.enkarta_guest_delivery_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$ BEGIN
  IF (NEW.sent,NEW.allow_kids,NEW.delivery_status,NEW.whatsapp_opened_at,NEW.manually_marked_at,
      NEW.last_reminder_at,NEW.reminder_count,NEW.last_delivery_request,NEW.last_delivery_expected_revision,NEW.guest_metadata)
    IS DISTINCT FROM
     (OLD.sent,OLD.allow_kids,OLD.delivery_status,OLD.whatsapp_opened_at,OLD.manually_marked_at,
      OLD.last_reminder_at,OLD.reminder_count,OLD.last_delivery_request,OLD.last_delivery_expected_revision,OLD.guest_metadata)
    AND NEW.response_revision = OLD.response_revision THEN
    NEW.response_revision := OLD.response_revision + 1;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enkarta_guest_delivery_revision() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_guest_delivery_revision() TO service_role;

-- No amplía permisos: la columna sigue protegida por RLS y las revocaciones de 006.
DROP FUNCTION pg_temp.enkarta_guest_metadata_016(jsonb,text);
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Resultado de comprobación (sin datos de contacto). Debe mostrar true y 0.
SELECT
  EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.guests'::regclass
    AND attname = 'guest_metadata' AND NOT attisdropped AND attnotnull)
  AND position('NEW.guest_metadata' IN pg_get_functiondef('public.enkarta_guest_delivery_revision()'::regprocedure)) > 0
  AS guest_metadata_ready,
  (SELECT count(*) FROM public.guests WHERE guest_metadata IS NULL) AS pending_rows;
