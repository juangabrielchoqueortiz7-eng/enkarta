-- Servicios, fase 7. Save the Date con preconfirmaciones propias.
-- Ejecutar completa después de 010. Reaplicable y sin borrar respuestas.
BEGIN;

CREATE TABLE IF NOT EXISTS public.save_date_responses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id uuid NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  response_key_hash text NOT NULL CHECK (response_key_hash ~ '^[0-9a-f]{64}$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  interest text NOT NULL CHECK (interest IN ('interested','maybe','unavailable')),
  guests integer NOT NULL DEFAULT 0 CHECK (guests BETWEEN 0 AND 20),
  message text NOT NULL DEFAULT '' CHECK (char_length(message) <= 400),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  last_request_id uuid NOT NULL,
  last_request_fingerprint text NOT NULL CHECK (char_length(last_request_fingerprint) = 64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invitation_id, response_key_hash)
);
CREATE INDEX IF NOT EXISTS save_date_responses_invitation_updated
  ON public.save_date_responses(invitation_id, updated_at DESC);
ALTER TABLE public.save_date_responses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.save_date_responses FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.save_date_responses TO service_role;

CREATE OR REPLACE FUNCTION public.enkarta_submit_save_date(
  p_slug text,
  p_response_key_hash text,
  p_name text,
  p_interest text,
  p_guests integer,
  p_message text,
  p_request_id uuid,
  p_request_fingerprint text,
  p_expected_revision integer
) RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  invitation_row public.invitations%ROWTYPE;
  previous public.save_date_responses%ROWTYPE;
  changed public.save_date_responses%ROWTYPE;
BEGIN
  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     OR p_response_key_hash !~ '^[0-9a-f]{64}$'
     OR p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 1 AND 120
     OR p_interest NOT IN ('interested','maybe','unavailable')
     OR p_guests IS NULL OR p_guests < 0 OR p_guests > 20
     OR (p_interest <> 'unavailable' AND p_guests < 1)
     OR p_message IS NULL OR char_length(p_message) > 400
     OR p_request_id IS NULL OR p_request_fingerprint !~ '^[0-9a-f]{64}$'
     OR p_expected_revision < 0 THEN RAISE EXCEPTION 'INVALID_INPUT';
  END IF;

  SELECT * INTO invitation_row FROM public.invitations
    WHERE slug = p_slug AND is_active = true AND status NOT IN ('disabled','expired')
      AND coalesce(builder_config::jsonb #>> '{additionalServices,saveDate,status}', '') = 'ready'
      AND coalesce((builder_config::jsonb #>> '{additionalServices,saveDate,enabled}')::boolean, false)
      AND coalesce((builder_config::jsonb #>> '{additionalServices,saveDate,published}')::boolean, false)
      AND coalesce((builder_config::jsonb #>> '{additionalServices,saveDate,preconfirmationEnabled}')::boolean, false)
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SAVE_DATE_CLOSED'; END IF;

  SELECT * INTO previous FROM public.save_date_responses
    WHERE invitation_id = invitation_row.id AND response_key_hash = p_response_key_hash FOR UPDATE;

  IF FOUND AND previous.last_request_id = p_request_id THEN
    IF previous.last_request_fingerprint <> p_request_fingerprint THEN RAISE EXCEPTION 'REQUEST_REUSED'; END IF;
    RETURN jsonb_build_object('response', to_jsonb(previous), 'replayed', true);
  END IF;
  IF FOUND AND previous.revision <> p_expected_revision THEN RAISE EXCEPTION 'STALE_SAVE_DATE'; END IF;
  IF NOT FOUND AND p_expected_revision <> 0 THEN RAISE EXCEPTION 'STALE_SAVE_DATE'; END IF;

  INSERT INTO public.save_date_responses(invitation_id,response_key_hash,name,interest,guests,message,revision,last_request_id,last_request_fingerprint)
    VALUES(invitation_row.id,p_response_key_hash,btrim(p_name),p_interest,CASE WHEN p_interest='unavailable' THEN 0 ELSE p_guests END,btrim(p_message),1,p_request_id,p_request_fingerprint)
  ON CONFLICT(invitation_id,response_key_hash) DO UPDATE SET
    name=excluded.name,interest=excluded.interest,guests=excluded.guests,message=excluded.message,
    revision=public.save_date_responses.revision+1,last_request_id=excluded.last_request_id,
    last_request_fingerprint=excluded.last_request_fingerprint,updated_at=statement_timestamp()
  RETURNING * INTO changed;
  RETURN jsonb_build_object('response', to_jsonb(changed), 'replayed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.enkarta_submit_save_date(text,text,text,text,integer,text,uuid,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_submit_save_date(text,text,text,text,integer,text,uuid,text,integer) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
