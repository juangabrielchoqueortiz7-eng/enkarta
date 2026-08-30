-- Embudo comercial Enkarta: atribución anónima y seguimiento manual de ventas.
-- Ejecutar completa después de 011. Es reaplicable y no toca datos de invitados.
BEGIN;

CREATE TABLE IF NOT EXISTS public.commercial_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_hash text NOT NULL CHECK (session_hash ~ '^[0-9a-f]{64}$'),
  event_type text NOT NULL CHECK (event_type IN ('landing_view','design_view','process_view','whatsapp_open')),
  package_key text NOT NULL DEFAULT 'general' CHECK (package_key IN ('general','plus','premium','exclusive')),
  design text NOT NULL DEFAULT '' CHECK (char_length(design) <= 80),
  event_category text NOT NULL DEFAULT '' CHECK (char_length(event_category) <= 50),
  placement text NOT NULL DEFAULT '' CHECK (char_length(placement) <= 60),
  landing_path text NOT NULL DEFAULT '/' CHECK (char_length(landing_path) <= 160),
  referrer_host text NOT NULL DEFAULT '' CHECK (char_length(referrer_host) <= 100),
  utm_source text NOT NULL DEFAULT '' CHECK (char_length(utm_source) <= 80),
  utm_medium text NOT NULL DEFAULT '' CHECK (char_length(utm_medium) <= 80),
  utm_campaign text NOT NULL DEFAULT '' CHECK (char_length(utm_campaign) <= 120),
  utm_content text NOT NULL DEFAULT '' CHECK (char_length(utm_content) <= 120),
  utm_term text NOT NULL DEFAULT '' CHECK (char_length(utm_term) <= 120),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commercial_events_occurred ON public.commercial_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS commercial_events_source ON public.commercial_events(utm_source, utm_campaign, occurred_at DESC);
CREATE INDEX IF NOT EXISTS commercial_events_session ON public.commercial_events(session_hash, event_type);

CREATE TABLE IF NOT EXISTS public.commercial_leads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference text NOT NULL UNIQUE CHECK (reference ~ '^EK-[A-F0-9]{8}$'),
  session_hash text NOT NULL CHECK (session_hash ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'whatsapp_open' CHECK (status IN ('whatsapp_open','contacted','reserved','won','lost')),
  package_key text NOT NULL DEFAULT 'general' CHECK (package_key IN ('general','plus','premium','exclusive')),
  design text NOT NULL DEFAULT '' CHECK (char_length(design) <= 80),
  event_category text NOT NULL DEFAULT '' CHECK (char_length(event_category) <= 50),
  placement text NOT NULL DEFAULT '' CHECK (char_length(placement) <= 60),
  landing_path text NOT NULL DEFAULT '/' CHECK (char_length(landing_path) <= 160),
  referrer_host text NOT NULL DEFAULT '' CHECK (char_length(referrer_host) <= 100),
  utm_source text NOT NULL DEFAULT '' CHECK (char_length(utm_source) <= 80),
  utm_medium text NOT NULL DEFAULT '' CHECK (char_length(utm_medium) <= 80),
  utm_campaign text NOT NULL DEFAULT '' CHECK (char_length(utm_campaign) <= 120),
  utm_content text NOT NULL DEFAULT '' CHECK (char_length(utm_content) <= 120),
  utm_term text NOT NULL DEFAULT '' CHECK (char_length(utm_term) <= 120),
  revenue_bs numeric(12,2) CHECK (revenue_bs IS NULL OR revenue_bs >= 0),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commercial_leads_pipeline ON public.commercial_leads(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS commercial_leads_source ON public.commercial_leads(utm_source, utm_campaign, created_at DESC);

CREATE TABLE IF NOT EXISTS public.commercial_lead_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id uuid NOT NULL REFERENCES public.commercial_leads(id) ON DELETE CASCADE,
  from_status text NOT NULL CHECK (from_status IN ('whatsapp_open','contacted','reserved','won','lost')),
  to_status text NOT NULL CHECK (to_status IN ('whatsapp_open','contacted','reserved','won','lost')),
  revenue_bs numeric(12,2) CHECK (revenue_bs IS NULL OR revenue_bs >= 0),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commercial_lead_history_lead ON public.commercial_lead_history(lead_id, created_at DESC);

ALTER TABLE public.commercial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_lead_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commercial_events, public.commercial_leads, public.commercial_lead_history FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.commercial_events, public.commercial_leads, public.commercial_lead_history FROM service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_events, public.commercial_leads, public.commercial_lead_history TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
