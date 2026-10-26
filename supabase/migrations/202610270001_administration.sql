-- Phase 3. Additive; apply after all seven 20261026 migrations on approved staging.
CREATE TABLE public.application_locks (key text PRIMARY KEY, version bigint NOT NULL DEFAULT 0);
INSERT INTO public.application_locks(key) VALUES ('roles'),('tutoring'),('support');
ALTER TABLE public.application_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.application_locks FROM PUBLIC,anon,authenticated;

CREATE TABLE public.admin_audit_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid, action text NOT NULL,
 target_id text NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_created ON public.admin_audit_log(created_at DESC,id);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.admin_audit_log TO authenticated;
CREATE POLICY "Administrators read audit trail" ON public.admin_audit_log FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
REVOKE INSERT,UPDATE,DELETE ON public.admin_audit_log FROM anon,authenticated;

-- Updating a shared row serializes writers and fails stale REPEATABLE READ /
-- SERIALIZABLE snapshots. Advisory locks alone do not invalidate stale snapshots.
CREATE OR REPLACE FUNCTION public.prevent_admin_lockout() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.application_locks SET version=version+1 WHERE key='roles';
 IF TG_OP IN ('UPDATE','DELETE') AND OLD.role='admin' AND
   (TG_OP='DELETE' OR NEW.role<>'admin' OR NEW.user_id<>OLD.user_id) THEN
   IF OLD.user_id=auth.uid() THEN RAISE EXCEPTION 'You cannot remove your own admin role'; END IF;
   IF (SELECT count(*) FROM public.user_roles WHERE role='admin')<=1 THEN RAISE EXCEPTION 'At least one admin must remain'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER prevent_admin_lockout_trigger ON public.user_roles;
CREATE TRIGGER prevent_admin_lockout_trigger BEFORE INSERT OR DELETE OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_lockout();
REVOKE INSERT,UPDATE,DELETE ON public.user_roles FROM authenticated;

CREATE FUNCTION public.audit_role_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.admin_audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'role.'||lower(TG_OP),
 CASE WHEN TG_OP='DELETE' THEN OLD.user_id ELSE NEW.user_id END::text,
 jsonb_build_object('role',CASE WHEN TG_OP='DELETE' THEN OLD.role ELSE NEW.role END));
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER audit_role_change AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_role_change();
REVOKE ALL ON FUNCTION public.audit_role_change() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.admin_set_role(target_user uuid, target_role public.app_role, grant_role boolean, reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.application_locks SET version=version+1 WHERE key='roles';
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF coalesce(length(trim(reason)),0) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'A reason between 3 and 500 characters is required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=target_user) THEN RAISE EXCEPTION 'Account not found'; END IF;
 IF grant_role THEN INSERT INTO public.user_roles(user_id,role) VALUES(target_user,target_role) ON CONFLICT DO NOTHING;
 ELSE DELETE FROM public.user_roles WHERE user_id=target_user AND role=target_role; END IF;
 INSERT INTO public.admin_audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'role.review',target_user::text,jsonb_build_object('role',target_role,'granted',grant_role,'reason',trim(reason)));
END $$;
REVOKE ALL ON FUNCTION public.admin_set_role(uuid,public.app_role,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid,public.app_role,boolean,text) TO authenticated;

ALTER TABLE public.courses ADD COLUMN review_status text NOT NULL DEFAULT 'draft' CHECK(review_status IN ('draft','pending','approved','rejected'));
UPDATE public.courses SET review_status='approved' WHERE is_published;
CREATE INDEX courses_review_status ON public.courses(review_status,created_at DESC);
CREATE FUNCTION public.guard_course_review() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF current_user IN ('authenticated','anon') THEN
  IF TG_OP='INSERT' AND (NEW.review_status<>'draft' OR NEW.is_published) THEN RAISE EXCEPTION 'New courses must be drafts'; END IF;
  IF TG_OP='UPDATE' AND (NEW.review_status IS DISTINCT FROM OLD.review_status OR (NEW.is_published AND NOT OLD.is_published)) THEN
   RAISE EXCEPTION 'Use the course review workflow'; END IF;
  IF TG_OP='UPDATE' AND (NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description OR NEW.price_bdt IS DISTINCT FROM OLD.price_bdt) THEN
   NEW.review_status='draft'; NEW.is_published=false;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_course_review BEFORE INSERT OR UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.guard_course_review();
REVOKE ALL ON FUNCTION public.guard_course_review() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.request_course_review(target_course uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'teacher') THEN RAISE EXCEPTION 'Teacher access required'; END IF;
 UPDATE public.courses SET review_status='pending',is_published=false WHERE id=target_course AND teacher_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Owned course not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.request_course_review(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_course_review(uuid) TO authenticated;
CREATE FUNCTION public.admin_course_action(target_course uuid, action text, reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF coalesce(length(trim(reason)),0) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'A reason between 3 and 500 characters is required'; END IF;
 PERFORM 1 FROM public.courses WHERE id=target_course FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Course not found'; END IF;
 IF action='approve' THEN
  IF NOT EXISTS(SELECT 1 FROM public.courses WHERE id=target_course AND review_status='pending') THEN RAISE EXCEPTION 'Course is not pending review'; END IF;
  UPDATE public.courses SET review_status='approved',is_published=true WHERE id=target_course;
 ELSIF action IN ('reject','unpublish') THEN UPDATE public.courses SET review_status=CASE WHEN action='reject' THEN 'rejected' ELSE 'draft' END,is_published=false WHERE id=target_course;
 ELSE RAISE EXCEPTION 'Invalid course action'; END IF;
 INSERT INTO public.admin_audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'course.'||action,target_course::text,jsonb_build_object('reason',trim(reason)));
END $$;
REVOKE ALL ON FUNCTION public.admin_course_action(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_course_action(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_teacher_request(request_id uuid, approve boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE req public.teacher_requests;
BEGIN
 UPDATE public.application_locks SET version=version+1 WHERE key='roles';
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 SELECT * INTO req FROM public.teacher_requests WHERE id=request_id AND status='pending' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pending request not found'; END IF;
 IF approve THEN INSERT INTO public.user_roles(user_id,role) VALUES(req.user_id,'teacher') ON CONFLICT DO NOTHING; END IF;
 UPDATE public.teacher_requests SET status=CASE WHEN approve THEN 'approved' ELSE 'dismissed' END,updated_at=now() WHERE id=request_id;
 INSERT INTO public.admin_audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'teacher_request.review',request_id::text,jsonb_build_object('approved',approve));
END $$;
