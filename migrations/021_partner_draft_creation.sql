-- Ejecutar completa después de 020. No modifica invitaciones existentes,
-- diseños, contratos, recursos originales, pagos ni publicaciones.
BEGIN;

-- Ambas APIs crean mediante INSERT. El bloqueo del socio comparte el orden de
-- 014/015 y hace indivisible la comprobación del cupo y la creación del borrador.
-- VOLATILE mantiene frescos los SELECT posteriores al bloqueo en READ COMMITTED:
-- una solicitud que esperó debe contar la creación que acaba de confirmarse.
CREATE OR REPLACE FUNCTION public.enkarta_guard_partner_draft_creation()
RETURNS trigger LANGUAGE plpgsql VOLATILE SET search_path = '' AS $$
DECLARE current_plan text; required_package text; maximum integer; used bigint;
BEGIN
  IF NEW.partner_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND NEW.partner_id IS NOT DISTINCT FROM OLD.partner_id THEN RETURN NEW; END IF;

  PERFORM 1 FROM public.partners WHERE id=NEW.partner_id AND status='active' FOR UPDATE;
  IF NOT FOUND OR NEW.status IS DISTINCT FROM 'draft' THEN RAISE EXCEPTION 'DRAFT_CREATE_FORBIDDEN'; END IF;

  -- Diseñar no requiere una mensualidad activa. Conserva el plan de la cuenta,
  -- también cuando está vencida; sin fila de suscripción se usa Inicio.
  SELECT plan_key INTO current_plan FROM public.partner_subscriptions WHERE partner_id=NEW.partner_id;
  current_plan:=coalesce(current_plan,'inicio');
  required_package:=CASE current_plan WHEN 'inicio' THEN 'plus' WHEN 'estudio' THEN 'premium' WHEN 'agencia' THEN 'exclusive' END;
  maximum:=CASE current_plan WHEN 'inicio' THEN 12 WHEN 'estudio' THEN 30 WHEN 'agencia' THEN 200 END;
  IF required_package IS NULL OR NEW.builder_config->>'package' IS DISTINCT FROM required_package THEN
    RAISE EXCEPTION 'DRAFT_PLAN_CHANGED';
  END IF;

  -- Incluye borradores, pausadas, vencidas y publicadas. El INSERT aún no existe
  -- en este punto; en una reasignación se excluye únicamente su propia fila.
  SELECT count(*) INTO used FROM public.invitations WHERE partner_id=NEW.partner_id AND id IS DISTINCT FROM NEW.id;
  IF used>=maximum THEN RAISE EXCEPTION USING MESSAGE='DRAFT_QUOTA_REACHED',DETAIL=maximum::text; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enkarta_guard_partner_draft_creation ON public.invitations;
CREATE TRIGGER enkarta_guard_partner_draft_creation BEFORE INSERT OR UPDATE OF partner_id ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.enkarta_guard_partner_draft_creation();

REVOKE ALL ON FUNCTION public.enkarta_guard_partner_draft_creation() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_guard_partner_draft_creation() TO service_role;

-- Inspección sin datos privados para verificar la instalación tras ejecutar SQL.
-- No crea borradores ni modifica tablas y no eleva privilegios.
CREATE OR REPLACE FUNCTION public.enkarta_partner_draft_creation_ready()
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS(
    SELECT 1 FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
    WHERE t.tgrelid=to_regclass('public.invitations') AND t.tgname='enkarta_guard_partner_draft_creation'
      AND NOT t.tgisinternal AND t.tgenabled IN ('O','A') AND t.tgtype=23
      AND t.tgattr::text=(SELECT attnum::text FROM pg_catalog.pg_attribute
        WHERE attrelid=to_regclass('public.invitations') AND attname='partner_id' AND NOT attisdropped)
      AND p.oid=to_regprocedure('public.enkarta_guard_partner_draft_creation()') AND NOT p.prosecdef AND p.provolatile='v'
      AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
      AND NOT has_function_privilege('authenticated',p.oid,'EXECUTE')
      AND has_function_privilege('service_role',p.oid,'EXECUTE')
  ) AND NOT has_function_privilege('anon','public.enkarta_partner_draft_creation_ready()','EXECUTE')
    AND NOT has_function_privilege('authenticated','public.enkarta_partner_draft_creation_ready()','EXECUTE')
    AND has_function_privilege('service_role','public.enkarta_partner_draft_creation_ready()','EXECUTE');
$$;
REVOKE ALL ON FUNCTION public.enkarta_partner_draft_creation_ready() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_partner_draft_creation_ready() TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;

SELECT public.enkarta_partner_draft_creation_ready() AS partner_draft_creation_ready;
