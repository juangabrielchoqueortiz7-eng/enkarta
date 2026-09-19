-- Programa de socios Enkarta: cuentas que entran con Google, suscripción mensual
-- al sistema y pagos verificados con comprobante. Ejecutar completa después de 012.
-- Es reaplicable y no toca invitaciones, invitados ni datos del embudo comercial.
BEGIN;

-- Cuenta del socio. El id es el mismo uuid del usuario de Supabase Auth (Google),
-- así la sesión del navegador y el expediente comercial nunca se desincronizan.
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY,
  email text NOT NULL CHECK (char_length(email) <= 160),
  full_name text NOT NULL DEFAULT '' CHECK (char_length(full_name) <= 120),
  avatar_url text NOT NULL DEFAULT '' CHECK (char_length(avatar_url) <= 500),
  brand_name text NOT NULL DEFAULT '' CHECK (char_length(brand_name) <= 80),
  phone text NOT NULL DEFAULT '' CHECK (char_length(phone) <= 30),
  city text NOT NULL DEFAULT '' CHECK (char_length(city) <= 60),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS partners_email ON public.partners(lower(email));
CREATE INDEX IF NOT EXISTS partners_created ON public.partners(created_at DESC);

-- Una fila por socio: el estado vigente. El historial vive en partner_payments.
CREATE TABLE IF NOT EXISTS public.partner_subscriptions (
  partner_id uuid PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  plan_key text NOT NULL DEFAULT 'inicio' CHECK (plan_key IN ('inicio', 'estudio', 'agencia')),
  status text NOT NULL DEFAULT 'none' CHECK (status IN ('none', 'pending', 'active', 'canceled')),
  started_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_subscriptions_renewal ON public.partner_subscriptions(status, current_period_end);

-- Cada intento de pago con su comprobante. El equipo Enkarta aprueba o rechaza;
-- aprobar es lo único que extiende current_period_end.
CREATE TABLE IF NOT EXISTS public.partner_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference text NOT NULL UNIQUE CHECK (reference ~ '^ENK-[A-Z0-9]{6}$'),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  plan_key text NOT NULL CHECK (plan_key IN ('inicio', 'estudio', 'agencia')),
  months integer NOT NULL DEFAULT 1 CHECK (months BETWEEN 1 AND 12),
  amount_bs numeric(12,2) NOT NULL CHECK (amount_bs >= 0),
  method text NOT NULL DEFAULT 'qr' CHECK (method IN ('qr', 'transfer', 'cash')),
  -- Ruta dentro del bucket privado 'comprobantes'; se firma al leerla, nunca es pública.
  receipt_url text NOT NULL DEFAULT '' CHECK (char_length(receipt_url) <= 500),
  payer_note text NOT NULL DEFAULT '' CHECK (char_length(payer_note) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note text NOT NULL DEFAULT '' CHECK (char_length(review_note) <= 500),
  reviewed_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_payments_queue ON public.partner_payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS partner_payments_partner ON public.partner_payments(partner_id, created_at DESC);

-- Dueño de la invitación. NULL = invitación del propio equipo Enkarta: las que ya
-- existen conservan exactamente el comportamiento anterior.
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS invitations_partner ON public.invitations(partner_id, created_at DESC);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payments ENABLE ROW LEVEL SECURITY;
-- Todo el acceso pasa por el servidor (service role). El navegador del socio solo
-- guarda su sesión de Auth; nunca consulta estas tablas de forma directa.
REVOKE ALL ON public.partners, public.partner_subscriptions, public.partner_payments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners, public.partner_subscriptions, public.partner_payments TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
