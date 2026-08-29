-- Fase 2: credenciales de revisión distintas de la gestión del evento.
-- Requiere invitations (001). No cambia paquetes, claves existentes ni invitados.
BEGIN;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS review_email text;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS review_password_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS invitations_review_email_unique
  ON public.invitations (lower(review_email)) WHERE review_email IS NOT NULL;
NOTIFY pgrst, 'reload schema';
COMMIT;
