-- ============================================
-- Enkarta — Gestión de invitados + Control de acceso
-- Migration 002: guests, attendees, access_log + credenciales de evento
-- ============================================

-- ── Credenciales y configuración de acceso por evento (1:1 con invitations) ──
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS host_email TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS host_password_hash TEXT;   -- scrypt (salt:hash)
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS rsvp_deadline DATE;        -- fecha límite de confirmación
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS whatsapp_template TEXT;    -- mensaje de envío configurable

CREATE INDEX IF NOT EXISTS idx_invitations_host_email ON invitations(host_email);

-- ── Invitado individual (reemplaza guests/<id>.json) ──
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  public_id TEXT UNIQUE NOT NULL,        -- corto, va en el link ?g= y resuelve el QR
  name TEXT NOT NULL,
  table_no TEXT,                          -- mesa (opcional)
  passes INTEGER NOT NULL DEFAULT 1,
  allow_kids BOOLEAN DEFAULT true,        -- false → la invitación muestra el párrafo "no niños"
  sent BOOLEAN DEFAULT false,             -- "invitación enviada" (manual)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','declined')),
  confirmed_passes INTEGER,
  confirm_name TEXT,
  message TEXT,
  responded_at TIMESTAMPTZ,
  access_token TEXT UNIQUE,               -- se genera al confirmar; contenido del QR
  access_code TEXT,                       -- ID visual legible (ej. ENK-7K2P)
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guests_invitation ON guests(invitation_id);
CREATE INDEX IF NOT EXISTS idx_guests_public_id ON guests(public_id);
CREATE INDEX IF NOT EXISTS idx_guests_access_token ON guests(access_token);

-- ── Asiento/persona para check-in parcial (1 guest de N pases → N asientos) ──
CREATE TABLE IF NOT EXISTS attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  seat_no INTEGER NOT NULL,               -- 1..passes
  label TEXT,
  state TEXT NOT NULL DEFAULT 'out' CHECK (state IN ('out','in')),
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  UNIQUE (guest_id, seat_no)
);
CREATE INDEX IF NOT EXISTS idx_attendees_guest ON attendees(guest_id);

-- ── Bitácora antifraude / auditoría ──
CREATE TABLE IF NOT EXISTS access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID,
  attendee_id UUID,
  action TEXT CHECK (action IN ('in','out')),
  at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_access_log_guest ON access_log(guest_id);

-- ============================================
-- Row Level Security: acceso solo vía service role (API routes con supabaseAdmin)
-- ============================================
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access guests"    ON guests     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access attendees" ON attendees  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access acceslog"  ON access_log FOR ALL USING (true) WITH CHECK (true);
