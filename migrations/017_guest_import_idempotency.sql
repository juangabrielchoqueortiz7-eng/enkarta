-- Importación recuperable de invitados. Ejecutar completa después de 016.
-- Reaplicable. No modifica invitados existentes, diseños, recursos ni pagos.
BEGIN;

CREATE TABLE IF NOT EXISTS public.guest_import_requests (
  invitation_id uuid NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  guest_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (invitation_id, request_id)
);
ALTER TABLE public.guest_import_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guest_import_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_import_requests TO service_role;

CREATE OR REPLACE FUNCTION public.enkarta_import_guests(p_invitation_id uuid, p_request_id uuid, p_guests jsonb, p_table_assignment boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE
  fingerprint text;
  operation public.guest_import_requests%ROWTYPE;
  item jsonb;
  created_id uuid;
  ids uuid[] := '{}';
  result jsonb;
  replayed boolean;
BEGIN
  IF p_invitation_id IS NULL OR p_request_id IS NULL OR jsonb_typeof(p_guests) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'INVALID_INPUT';
  END IF;
  IF jsonb_array_length(p_guests) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  -- public_id se genera de nuevo en el servidor en cada intento; no es parte
  -- de la intención del usuario. El resto del lote y su orden sí deben coincidir.
  SELECT encode(sha256(convert_to(jsonb_agg(value - 'public_id' ORDER BY ord)::text,'UTF8')),'hex')
    INTO fingerprint FROM jsonb_array_elements(p_guests) WITH ORDINALITY AS entries(value,ord);

  INSERT INTO public.guest_import_requests(invitation_id,request_id,payload_hash)
    VALUES(p_invitation_id,p_request_id,fingerprint) ON CONFLICT DO NOTHING;
  -- Dos solicitudes de la misma operación esperan la misma fila. La creación
  -- del registro y TODOS los invitados se confirman o revierten juntos.
  SELECT * INTO operation FROM public.guest_import_requests
    WHERE invitation_id=p_invitation_id AND request_id=p_request_id FOR UPDATE;
  IF operation.payload_hash <> fingerprint THEN RAISE EXCEPTION 'REQUEST_REUSED'; END IF;
  replayed := cardinality(operation.guest_ids) > 0;
  IF replayed THEN
    ids := operation.guest_ids;
  ELSE
    FOR item IN SELECT value FROM jsonb_array_elements(p_guests) LOOP
      IF jsonb_typeof(item) IS DISTINCT FROM 'object'
        OR jsonb_typeof(item->'name') IS DISTINCT FROM 'string'
        OR length(btrim(item->>'name')) NOT BETWEEN 1 AND 80
        OR coalesce(item->>'public_id','') !~ '^[A-Z2-9]{8}$'
        OR jsonb_typeof(item->'passes') IS DISTINCT FROM 'number'
        OR (item->>'passes') !~ '^([1-9]|1[0-9]|20)$'
        OR jsonb_typeof(item->'allow_kids') IS DISTINCT FROM 'boolean'
        OR jsonb_typeof(item->'sent') IS DISTINCT FROM 'boolean'
        OR jsonb_typeof(item->'guest_metadata') IS DISTINCT FROM 'object'
        OR (item->'table_no' <> 'null'::jsonb AND
          (jsonb_typeof(item->'table_no') IS DISTINCT FROM 'string' OR length(item->>'table_no')>20))
      THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
      INSERT INTO public.guests(invitation_id,public_id,name,table_no,passes,allow_kids,sent,status,guest_metadata)
        VALUES(p_invitation_id,item->>'public_id',item->>'name',CASE WHEN p_table_assignment THEN item->>'table_no' ELSE NULL END,
          (item->>'passes')::integer,(item->>'allow_kids')::boolean,(item->>'sent')::boolean,'pending',item->'guest_metadata')
        RETURNING id INTO created_id;
      ids := array_append(ids,created_id);
    END LOOP;
    UPDATE public.guest_import_requests SET guest_ids=ids
      WHERE invitation_id=p_invitation_id AND request_id=p_request_id;
  END IF;
  -- La recuperación lee las versiones ACTUALES y no restaura filas eliminadas
  -- ni sobrescribe contactos, confirmaciones o accesos posteriores al importado.
  SELECT coalesce(jsonb_agg(to_jsonb(g) ORDER BY ordered.ord),'[]'::jsonb) INTO result
    FROM unnest(ids) WITH ORDINALITY AS ordered(id,ord)
    JOIN public.guests g ON g.id=ordered.id AND g.invitation_id=p_invitation_id;
  RETURN jsonb_build_object('guests',result,'replayed',replayed,'importedCount',cardinality(ids),
    'missingCount',cardinality(ids)-jsonb_array_length(result));
END; $$;
REVOKE ALL ON FUNCTION public.enkarta_import_guests(uuid,uuid,jsonb,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_import_guests(uuid,uuid,jsonb,boolean) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;

SELECT to_regprocedure('public.enkarta_import_guests(uuid,uuid,jsonb,boolean)') IS NOT NULL
  AND coalesce((SELECT relrowsecurity FROM pg_class WHERE oid='public.guest_import_requests'::regclass),false)
  AND NOT has_table_privilege('anon','public.guest_import_requests','SELECT')
  AND NOT has_table_privilege('authenticated','public.guest_import_requests','SELECT')
  AND NOT has_function_privilege('anon','public.enkarta_import_guests(uuid,uuid,jsonb,boolean)','EXECUTE')
  AND NOT has_function_privilege('authenticated','public.enkarta_import_guests(uuid,uuid,jsonb,boolean)','EXECUTE')
  AND has_function_privilege('service_role','public.enkarta_import_guests(uuid,uuid,jsonb,boolean)','EXECUTE')
  AS guest_import_ready;
