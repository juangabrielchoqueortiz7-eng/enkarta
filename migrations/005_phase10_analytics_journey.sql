-- ============================================
-- Enkarta — Fase 10: recorrido agregado
-- Ejecutar después de 004_builder_cloud_and_analytics.sql
-- ============================================

-- Amplía el catálogo de eventos sin cambiar la estructura ni exponer datos
-- personales. Los umbrales de scroll se guardan como eventos separados para
-- poder calcular el embudo con consultas simples y auditables.
ALTER TABLE invitation_analytics_events
  DROP CONSTRAINT IF EXISTS invitation_analytics_events_event_type_check;

ALTER TABLE invitation_analytics_events
  ADD CONSTRAINT invitation_analytics_events_event_type_check CHECK (event_type IN (
    'view', 'entry_open', 'rsvp_start', 'rsvp_submit', 'map_open',
    'calendar_add', 'gallery_open', 'share', 'link_open', 'music_toggle',
    'scroll_25', 'scroll_50', 'scroll_75', 'scroll_100', 'cta_click'
  ));

-- Cada sesión aporta como máximo una observación a cada profundidad. Esto
-- mantiene las métricas agregadas aunque el navegador reintente una petición.
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitation_analytics_unique_scroll
  ON invitation_analytics_events(invitation_id, session_id, event_type)
  WHERE event_type IN ('scroll_25', 'scroll_50', 'scroll_75', 'scroll_100');

COMMENT ON COLUMN invitation_analytics_events.guest_public_id IS
  'Hash irreversible y corto del identificador público; nunca almacena nombre, teléfono ni mensaje.';
