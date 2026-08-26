-- ============================================
-- Enkarta — Constructor colaborativo + analítica detallada
-- Migration 004
-- ============================================

-- Versiones completas del documento del constructor.
CREATE TABLE IF NOT EXISTS builder_versions (
  id TEXT PRIMARY KEY,
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'save', 'publish', 'restore')),
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_builder_versions_invitation
  ON builder_versions(invitation_id, created_at DESC);

-- Comentarios vinculables a un bloque concreto.
CREATE TABLE IF NOT EXISTS builder_review_notes (
  id TEXT PRIMARY KEY,
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Equipo',
  block_id TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_builder_review_notes_invitation
  ON builder_review_notes(invitation_id, resolved, created_at DESC);

-- Biblioteca global del equipo Enkarta. owner_key deja preparado el modelo para
-- separar cuentas cuando el panel tenga usuarios individuales.
CREATE TABLE IF NOT EXISTS builder_user_sections (
  id TEXT PRIMARY KEY,
  owner_key TEXT NOT NULL DEFAULT 'admin',
  name TEXT NOT NULL,
  blocks JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_builder_user_sections_owner
  ON builder_user_sections(owner_key, created_at DESC);

-- Eventos de comportamiento de la invitación pública. No guarda nombres,
-- teléfonos ni mensajes; guest_public_id es el identificador corto del enlace.
CREATE TABLE IF NOT EXISTS invitation_analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'view', 'entry_open', 'rsvp_start', 'rsvp_submit', 'map_open',
    'calendar_add', 'gallery_open', 'share', 'link_open', 'music_toggle'
  )),
  session_id TEXT NOT NULL,
  guest_public_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invitation_analytics_lookup
  ON invitation_analytics_events(invitation_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitation_analytics_session
  ON invitation_analytics_events(invitation_id, session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitation_analytics_unique_open
  ON invitation_analytics_events(invitation_id, session_id, event_type)
  WHERE event_type IN ('view', 'entry_open');

-- Sin políticas públicas: estas tablas solo se usan mediante rutas de servidor
-- con service role. La ruta pública de analítica valida y limita cada evento.
ALTER TABLE builder_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_review_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_user_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_analytics_events ENABLE ROW LEVEL SECURITY;

-- Incremento atómico del contador histórico. Evita perder vistas cuando dos
-- personas abren la invitación al mismo tiempo.
CREATE OR REPLACE FUNCTION increment_invitation_views(target_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE invitations
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = target_id;
$$;
REVOKE ALL ON FUNCTION increment_invitation_views(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_invitation_views(UUID) TO service_role;
