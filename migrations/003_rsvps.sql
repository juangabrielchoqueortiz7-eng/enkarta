-- ============================================
-- Enkarta — Confirmaciones abiertas (RSVP)
-- Migration 003: tabla rsvps (reemplaza rsvps/<id>.json en Storage)
-- ============================================
-- El JSON en Storage se leía y reescribía completo: dos invitados confirmando
-- a la vez podían pisarse y perder una respuesta. Con la tabla, cada
-- confirmación es un INSERT atómico. Los JSON históricos se importan solos la
-- primera vez que el panel lee las confirmaciones de esa invitación (y el
-- archivo se elimina después).

CREATE TABLE IF NOT EXISTS rsvps (
  id TEXT PRIMARY KEY,                    -- conserva los ids legacy (r-xxxx)
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Invitado',
  attending TEXT NOT NULL DEFAULT 'yes' CHECK (attending IN ('yes','no')),
  passes INTEGER NOT NULL DEFAULT 1,
  message TEXT NOT NULL DEFAULT '',
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rsvps_invitation ON rsvps(invitation_id, at);

-- Solo el servidor (service role) accede; sin políticas públicas.
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
