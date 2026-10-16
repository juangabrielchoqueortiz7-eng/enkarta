-- Apply after 013. No design, media or original resource bytes are changed.
BEGIN;
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_status_check;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_status_check CHECK(status IN ('draft','ready','disabled','expired'));
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_template_check;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_template_check CHECK(template IN (
  'azure','primicia','passport','paradise','obsidiana','dolcevita','grazia','carmesi_v2','napoly','perla_v2','euforia','rosegold','allegria','provence','esmeralda',
  'perla','marmol','terra','sobre','carmesi','gerbera'));

ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS publication_managed boolean NOT NULL DEFAULT false;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS published_version_id text;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS scheduled_version_id text;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS draft_revision integer NOT NULL DEFAULT 0;
-- Existing rows without snapshots retain their legacy rendering. New rows must publish a snapshot.
ALTER TABLE public.invitations ALTER COLUMN publication_managed SET DEFAULT true;
CREATE OR REPLACE FUNCTION public.enkarta_draft_revision()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE ignored text[]:=ARRAY['draft_revision','status','publication_managed','published_version_id','scheduled_version_id',
  'views_count','expires_at','validity_mode','validity_extra_days','validity_revision'];
BEGIN
  NEW.draft_revision:=OLD.draft_revision;
  IF (to_jsonb(NEW)-ignored) IS DISTINCT FROM (to_jsonb(OLD)-ignored) THEN NEW.draft_revision:=OLD.draft_revision+1; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enkarta_draft_revision ON public.invitations;
CREATE TRIGGER enkarta_draft_revision BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION public.enkarta_draft_revision();

CREATE OR REPLACE FUNCTION public.enkarta_version_due(snapshot jsonb, created timestamptz)
RETURNS timestamptz LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
BEGIN
  IF snapshot #>> '{config,__enkartaVersion,publicationState}' = 'scheduled' THEN
    BEGIN RETURN (snapshot #>> '{config,__enkartaVersion,publishAt}')::timestamptz;
    EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN NULL; END;
  END IF;
  RETURN created;
END;
$$;

-- Backfill only once; reapplying cannot resurrect paused events or deleted schedules.
UPDATE public.invitations i SET publication_managed=true,
  published_version_id=(SELECT v.id FROM public.builder_versions v WHERE v.invitation_id=i.id AND v.source='publish'
    AND public.enkarta_version_due(v.snapshot,v.created_at)<=statement_timestamp()
    ORDER BY public.enkarta_version_due(v.snapshot,v.created_at) DESC,v.id DESC LIMIT 1),
  scheduled_version_id=(SELECT v.id FROM public.builder_versions v WHERE v.invitation_id=i.id AND v.source='publish'
    AND public.enkarta_version_due(v.snapshot,v.created_at)>statement_timestamp()
    ORDER BY public.enkarta_version_due(v.snapshot,v.created_at) ASC,v.id LIMIT 1),
  status=CASE WHEN i.status='draft' THEN 'ready' ELSE i.status END
WHERE NOT i.publication_managed AND EXISTS(SELECT 1 FROM public.builder_versions v WHERE v.invitation_id=i.id AND v.source='publish');
-- If the old retention bug already erased the public snapshot, fail closed.
-- Do not misclassify that working draft as a legacy invitation safe to publish.
UPDATE public.invitations SET publication_managed=true WHERE NOT publication_managed AND
  (builder_config #>> '{workflow,lastPublishedVersionId}' IS NOT NULL OR builder_config #>> '{workflow,lastPublishedAt}' IS NOT NULL
    OR builder_config #>> '{workflow,scheduledVersionId}' IS NOT NULL);

CREATE OR REPLACE FUNCTION public.enkarta_guard_builder_version()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP='UPDATE' AND (NEW.invitation_id<>OLD.invitation_id OR
    (OLD.source='publish' AND (NEW.snapshot,NEW.source,NEW.created_at) IS DISTINCT FROM (OLD.snapshot,OLD.source,OLD.created_at))) THEN
    RAISE EXCEPTION 'IMMUTABLE_PUBLICATION';
  END IF;
  IF TG_OP='DELETE' AND EXISTS(SELECT 1 FROM public.invitations i WHERE i.id=OLD.invitation_id
    AND (i.published_version_id=OLD.id OR i.scheduled_version_id=OLD.id)) THEN
    RAISE EXCEPTION 'ACTIVE_PUBLICATION';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enkarta_guard_builder_version ON public.builder_versions;
CREATE TRIGGER enkarta_guard_builder_version BEFORE UPDATE OR DELETE ON public.builder_versions
FOR EACH ROW EXECUTE FUNCTION public.enkarta_guard_builder_version();
CREATE OR REPLACE FUNCTION public.enkarta_guard_library_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_TABLE_NAME='builder_user_sections' THEN
    IF NEW.owner_key<>OLD.owner_key THEN RAISE EXCEPTION 'BUILDER_FORBIDDEN'; END IF;
  ELSIF NEW.invitation_id<>OLD.invitation_id THEN RAISE EXCEPTION 'BUILDER_FORBIDDEN'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enkarta_guard_section_owner ON public.builder_user_sections;
CREATE TRIGGER enkarta_guard_section_owner BEFORE UPDATE ON public.builder_user_sections FOR EACH ROW EXECUTE FUNCTION public.enkarta_guard_library_owner();
DROP TRIGGER IF EXISTS enkarta_guard_note_owner ON public.builder_review_notes;
CREATE TRIGGER enkarta_guard_note_owner BEFORE UPDATE ON public.builder_review_notes FOR EACH ROW EXECUTE FUNCTION public.enkarta_guard_library_owner();

-- Called only by authenticated server routes. Lock the account before the event,
-- so concurrent publications cannot both consume the final available slot.
CREATE OR REPLACE FUNCTION public.enkarta_assert_publish(p_id uuid,p_partner_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE inv public.invitations%ROWTYPE; sub public.partner_subscriptions%ROWTYPE; lim integer; used integer;
BEGIN
  IF p_partner_id IS NOT NULL THEN
    PERFORM 1 FROM public.partners WHERE id=p_partner_id AND status='active' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PUBLISH_FORBIDDEN'; END IF;
  END IF;
  SELECT * INTO inv FROM public.invitations WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF p_partner_id IS NULL THEN RETURN; END IF;
  IF inv.partner_id IS DISTINCT FROM p_partner_id THEN RAISE EXCEPTION 'PUBLISH_FORBIDDEN'; END IF;
  SELECT * INTO sub FROM public.partner_subscriptions WHERE partner_id=p_partner_id;
  IF sub.status IS DISTINCT FROM 'active' OR sub.current_period_end IS NULL OR sub.current_period_end<=statement_timestamp() THEN
    RAISE EXCEPTION 'SUBSCRIPTION_REQUIRED';
  END IF;
  lim:=CASE sub.plan_key WHEN 'inicio' THEN 3 WHEN 'estudio' THEN 10 WHEN 'agencia' THEN 0 ELSE -1 END;
  IF lim<0 THEN RAISE EXCEPTION 'SUBSCRIPTION_REQUIRED'; END IF;
  SELECT count(*) INTO used FROM public.invitations WHERE partner_id=p_partner_id AND status='ready' AND id<>p_id;
  IF lim>0 AND used>=lim THEN RAISE EXCEPTION 'QUOTA_REACHED'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enkarta_store_builder_state(
  p_invitation_id uuid,p_partner_id uuid,p_client boolean,p_versions jsonb,p_notes jsonb,p_action text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE inv public.invitations%ROWTYPE; item jsonb; old public.builder_versions%ROWTYPE;
  note public.builder_review_notes%ROWTYPE; snap jsonb; vid text; due timestamptz; now_at timestamptz:=statement_timestamp();
  pub_count integer; row_count integer;
BEGIN
  IF p_action IS NOT NULL AND p_action NOT IN ('publish','schedule') THEN RAISE EXCEPTION 'INVALID_ACTION'; END IF;
  SELECT count(*) INTO pub_count FROM jsonb_array_elements(p_versions) x WHERE x->>'source'='publish';
  IF p_client AND (jsonb_array_length(p_versions)>0 OR p_action IS NOT NULL) THEN RAISE EXCEPTION 'BUILDER_FORBIDDEN'; END IF;
  IF p_action IS NOT NULL AND pub_count<>1 THEN RAISE EXCEPTION 'PUBLICATION_ACTION_REQUIRED'; END IF;
  IF p_action IS NOT NULL THEN PERFORM public.enkarta_assert_publish(p_invitation_id,p_partner_id);
  ELSIF p_partner_id IS NOT NULL THEN PERFORM 1 FROM public.partners WHERE id=p_partner_id AND status='active' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'BUILDER_FORBIDDEN'; END IF;
  END IF;
  SELECT * INTO inv FROM public.invitations WHERE id=p_invitation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF p_partner_id IS NOT NULL AND inv.partner_id IS DISTINCT FROM p_partner_id THEN RAISE EXCEPTION 'BUILDER_FORBIDDEN'; END IF;
  IF inv.scheduled_version_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.builder_versions WHERE id=inv.scheduled_version_id
    AND public.enkarta_version_due(snapshot,created_at)<=now_at) THEN
    UPDATE public.invitations SET published_version_id=scheduled_version_id,scheduled_version_id=NULL WHERE id=p_invitation_id RETURNING * INTO inv;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_versions) LOOP
    vid:=item->>'id';
    SELECT * INTO old FROM public.builder_versions WHERE id=vid FOR UPDATE;
    IF FOUND AND old.invitation_id<>p_invitation_id THEN RAISE EXCEPTION 'BUILDER_FORBIDDEN'; END IF;
    snap:=item->'snapshot';
    -- A snapshot cannot carry another event's identity or grant new services.
    snap:=snap || jsonb_build_object('id',inv.id,'slug',inv.slug);
    IF p_partner_id IS NOT NULL THEN
      snap:=jsonb_set(snap,'{config}',(coalesce(snap->'config','{}'::jsonb)
        - 'package' - 'features' - 'serviceContract' - 'additionalServices' - 'qualityControl') ||
        (coalesce(inv.builder_config,'{}'::jsonb) - ARRAY(SELECT jsonb_object_keys(coalesce(inv.builder_config,'{}'::jsonb)) EXCEPT
          SELECT unnest(ARRAY['package','features','serviceContract','additionalServices','qualityControl']))));
    END IF;
    IF old.id IS NOT NULL AND old.source='publish' THEN
      IF jsonb_set(old.snapshot,'{config,__enkartaVersion}',coalesce(old.snapshot #> '{config,__enkartaVersion}','{}'::jsonb)-'publishAt'-'publicationState')
        IS DISTINCT FROM jsonb_set(snap,'{config,__enkartaVersion}',coalesce(snap #> '{config,__enkartaVersion}','{}'::jsonb)-'publishAt'-'publicationState')
        OR item->>'source'<>'publish' THEN RAISE EXCEPTION 'IMMUTABLE_PUBLICATION'; END IF;
      CONTINUE;
    END IF;
    IF item->>'source'='publish' THEN
      IF p_action IS NULL THEN RAISE EXCEPTION 'PUBLICATION_ACTION_REQUIRED'; END IF;
      IF p_action='schedule' THEN
        due:=public.enkarta_version_due(snap,now_at);
        IF snap #>> '{config,__enkartaVersion,publicationState}' IS DISTINCT FROM 'scheduled' OR due IS NULL OR due<=now_at+interval '1 minute' THEN
          RAISE EXCEPTION 'INVALID_SCHEDULE';
        END IF;
      ELSE
        snap:=jsonb_set(snap,'{config,__enkartaVersion}',coalesce(snap #> '{config,__enkartaVersion}','{}'::jsonb) ||
          jsonb_build_object('publicationState','published','publishAt',now_at));
      END IF;
    END IF;
    INSERT INTO public.builder_versions(id,invitation_id,label,source,snapshot,created_at)
      VALUES(vid,p_invitation_id,item->>'label',item->>'source',snap,
        CASE WHEN item->>'source'='publish' THEN now_at ELSE (item->>'created_at')::timestamptz END)
    ON CONFLICT(id) DO UPDATE SET label=excluded.label,source=excluded.source,snapshot=excluded.snapshot,created_at=excluded.created_at
      WHERE builder_versions.invitation_id=excluded.invitation_id AND builder_versions.source<>'publish';
    GET DIAGNOSTICS row_count=ROW_COUNT;
    IF row_count<>1 THEN RAISE EXCEPTION 'BUILDER_FORBIDDEN'; END IF;
    IF item->>'source'='publish' THEN
      UPDATE public.invitations SET publication_managed=true,status='ready',
        published_version_id=CASE WHEN p_action='publish' THEN vid ELSE published_version_id END,
        scheduled_version_id=CASE WHEN p_action='schedule' THEN vid ELSE NULL END WHERE id=p_invitation_id;
    END IF;
  END LOOP;
  FOR item IN SELECT * FROM jsonb_array_elements(p_notes) LOOP
    SELECT * INTO note FROM public.builder_review_notes WHERE id=item->>'id' FOR UPDATE;
    IF FOUND AND (note.invitation_id<>p_invitation_id OR (p_client AND split_part(note.text,E'\n',1) NOT LIKE '%"role":"client"%')) THEN
      RAISE EXCEPTION 'BUILDER_FORBIDDEN';
    END IF;
    INSERT INTO public.builder_review_notes(id,invitation_id,text,author,block_id,resolved,created_at)
      VALUES(item->>'id',p_invitation_id,item->>'text',item->>'author',item->>'block_id',(item->>'resolved')::boolean,(item->>'created_at')::timestamptz)
    ON CONFLICT(id) DO UPDATE SET text=excluded.text,author=excluded.author,block_id=excluded.block_id,resolved=excluded.resolved
      WHERE builder_review_notes.invitation_id=excluded.invitation_id;
    GET DIAGNOSTICS row_count=ROW_COUNT;
    IF row_count<>1 THEN RAISE EXCEPTION 'BUILDER_FORBIDDEN'; END IF;
  END LOOP;
  DELETE FROM public.builder_versions WHERE invitation_id=p_invitation_id AND source<>'publish'
    AND id IN (SELECT id FROM public.builder_versions WHERE invitation_id=p_invitation_id AND source<>'publish'
      ORDER BY created_at DESC,id DESC OFFSET 30);
  RETURN jsonb_build_object('success',true);
END;
$$;

CREATE OR REPLACE FUNCTION public.enkarta_set_publication(p_id uuid,p_partner_id uuid,p_enabled boolean)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE inv public.invitations%ROWTYPE;
BEGIN
  IF p_enabled THEN PERFORM public.enkarta_assert_publish(p_id,p_partner_id); END IF;
  SELECT * INTO inv FROM public.invitations WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF p_partner_id IS NOT NULL AND inv.partner_id IS DISTINCT FROM p_partner_id THEN RAISE EXCEPTION 'PUBLISH_FORBIDDEN'; END IF;
  IF p_enabled AND inv.publication_managed AND inv.published_version_id IS NULL AND inv.scheduled_version_id IS NULL THEN
    RAISE EXCEPTION 'PUBLICATION_REQUIRED';
  END IF;
  UPDATE public.invitations SET status=CASE WHEN p_enabled THEN 'ready' ELSE 'disabled' END WHERE id=p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enkarta_cancel_schedule(p_id uuid,p_version_id text)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE inv public.invitations%ROWTYPE; due timestamptz;
BEGIN
  SELECT * INTO inv FROM public.invitations WHERE id=p_id FOR UPDATE;
  SELECT public.enkarta_version_due(snapshot,created_at) INTO due FROM public.builder_versions WHERE id=p_version_id AND invitation_id=p_id;
  IF inv.scheduled_version_id IS DISTINCT FROM p_version_id OR due<=statement_timestamp() THEN RAISE EXCEPTION 'ACTIVE_PUBLICATION'; END IF;
  UPDATE public.invitations SET scheduled_version_id=NULL,status=CASE WHEN published_version_id IS NULL AND status='ready' THEN 'draft' ELSE status END WHERE id=p_id;
  DELETE FROM public.builder_versions WHERE id=p_version_id AND invitation_id=p_id;
END;
$$;

-- Public operations use exactly the same publication anchor as the renderer.
CREATE OR REPLACE FUNCTION public.enkarta_assert_event_open(p_id uuid,p_deadline boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE inv public.invitations%ROWTYPE; sub public.partner_subscriptions%ROWTYPE;
  today date:=(statement_timestamp() AT TIME ZONE 'America/La_Paz')::date;
BEGIN
  SELECT * INTO inv FROM public.invitations WHERE id=p_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF inv.is_active=false OR inv.status<>'ready' OR inv.expires_at<today OR (inv.validity_mode='automatic' AND inv.expires_at IS NULL) THEN RAISE EXCEPTION 'EVENT_CLOSED'; END IF;
  IF inv.publication_managed AND NOT EXISTS(SELECT 1 FROM public.builder_versions v WHERE v.invitation_id=p_id AND v.source='publish'
    AND v.id IN (inv.published_version_id,inv.scheduled_version_id) AND public.enkarta_version_due(v.snapshot,v.created_at)<=statement_timestamp()) THEN RAISE EXCEPTION 'EVENT_CLOSED'; END IF;
  IF inv.partner_id IS NOT NULL THEN
    SELECT s.* INTO sub FROM public.partner_subscriptions s JOIN public.partners p ON p.id=s.partner_id WHERE p.id=inv.partner_id AND p.status='active';
    IF NOT FOUND OR sub.status<>'active' OR sub.current_period_end IS NULL OR sub.current_period_end+interval '5 days'<=statement_timestamp() THEN RAISE EXCEPTION 'EVENT_CLOSED'; END IF;
  END IF;
  IF p_deadline AND inv.rsvp_deadline<today THEN RAISE EXCEPTION 'RSVP_CLOSED'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.enkarta_assert_publish(uuid,uuid),public.enkarta_store_builder_state(uuid,uuid,boolean,jsonb,jsonb,text),
  public.enkarta_set_publication(uuid,uuid,boolean),public.enkarta_cancel_schedule(uuid,text),public.enkarta_version_due(jsonb,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_assert_publish(uuid,uuid),public.enkarta_store_builder_state(uuid,uuid,boolean,jsonb,jsonb,text),
  public.enkarta_set_publication(uuid,uuid,boolean),public.enkarta_cancel_schedule(uuid,text),public.enkarta_version_due(jsonb,timestamptz) TO service_role;
REVOKE ALL ON public.builder_versions,public.builder_review_notes,public.builder_user_sections FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.builder_versions,public.builder_review_notes,public.builder_user_sections TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
