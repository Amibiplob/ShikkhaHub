-- Preserve certificate identity/history; PDF snapshots are server populated.
ALTER TABLE public.certificates ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE public.certificates DROP CONSTRAINT certificates_course_id_fkey;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_course_id_fkey FOREIGN KEY(course_id) REFERENCES public.courses(id) ON DELETE SET NULL;
ALTER TABLE public.certificates ALTER COLUMN certificate_number SET DEFAULT ('CERT-'||upper(gen_random_uuid()::text));
CREATE UNIQUE INDEX certificates_number_unique ON public.certificates(certificate_number);
ALTER TABLE public.certificates ADD COLUMN verification_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE public.certificates ADD COLUMN student_name text;
ALTER TABLE public.certificates ADD COLUMN course_title text;
ALTER TABLE public.certificates ADD COLUMN validated_at timestamptz;
ALTER TABLE public.certificates ADD COLUMN revoked_at timestamptz;
ALTER TABLE public.certificates ADD COLUMN revocation_reason text;
UPDATE public.certificates c SET student_name=p.full_name,course_title=k.title FROM public.profiles p,public.courses k WHERE p.user_id=c.user_id AND k.id=c.course_id;
REVOKE INSERT,UPDATE,DELETE ON public.certificates FROM authenticated;
DROP POLICY "System can insert certificates" ON public.certificates;

CREATE FUNCTION public.course_certificate_eligible(student uuid, course uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.courses c JOIN public.enrollments e ON e.course_id=c.id WHERE c.id=course AND c.is_published AND e.user_id=student)
 AND EXISTS(SELECT 1 FROM public.profiles WHERE user_id=student AND length(trim(full_name)) BETWEEN 1 AND 200)
 AND EXISTS(SELECT 1 FROM public.modules m JOIN public.lessons l ON l.module_id=m.id WHERE m.course_id=course)
 AND NOT EXISTS(SELECT 1 FROM public.modules m JOIN public.lessons l ON l.module_id=m.id WHERE m.course_id=course AND NOT EXISTS(SELECT 1 FROM public.lesson_progress p WHERE p.user_id=student AND p.lesson_id=l.id AND p.completed))
 AND NOT EXISTS(SELECT 1 FROM public.quizzes q WHERE q.course_id=course AND NOT EXISTS(SELECT 1 FROM public.quiz_attempts a WHERE a.quiz_id=q.id AND a.user_id=student AND a.passed))
 AND NOT EXISTS(SELECT 1 FROM public.assignments a WHERE a.course_id=course AND NOT EXISTS(SELECT 1 FROM public.submissions s WHERE s.assignment_id=a.id AND s.student_id=student AND s.status IN ('graded','reviewed') AND s.marks IS NOT NULL AND s.marks BETWEEN 0 AND a.max_marks));
$$;
REVOKE ALL ON FUNCTION public.course_certificate_eligible(uuid,uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.issue_certificate_for(student uuid, course uuid) RETURNS public.certificates LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result public.certificates;
BEGIN
 IF NOT public.course_certificate_eligible(student,course) THEN RETURN NULL; END IF;
 INSERT INTO public.certificates(user_id,course_id,student_name,course_title,validated_at)
 SELECT student,course,p.full_name,c.title,now() FROM public.profiles p,public.courses c WHERE p.user_id=student AND c.id=course
 ON CONFLICT(user_id,course_id) DO UPDATE SET
 student_name=CASE WHEN certificates.validated_at IS NULL THEN EXCLUDED.student_name ELSE certificates.student_name END,
 course_title=CASE WHEN certificates.validated_at IS NULL THEN EXCLUDED.course_title ELSE certificates.course_title END,
 validated_at=coalesce(certificates.validated_at,EXCLUDED.validated_at)
 RETURNING * INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.issue_certificate_for(uuid,uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.issue_course_certificate(target_course uuid) RETURNS public.certificates LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result public.certificates;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 result=public.issue_certificate_for(auth.uid(),target_course);
 IF result.id IS NULL THEN RAISE EXCEPTION 'Complete all lessons, pass every quiz and obtain grades for all assignments before requesting a certificate'; END IF;
 IF result.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'This certificate has been revoked'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.issue_course_certificate(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.issue_course_certificate(uuid) TO authenticated;

CREATE FUNCTION public.auto_issue_course_certificate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE student uuid; course uuid;
BEGIN
 IF TG_TABLE_NAME='lesson_progress' THEN
  student=NEW.user_id; SELECT m.course_id INTO course FROM public.lessons l JOIN public.modules m ON m.id=l.module_id WHERE l.id=NEW.lesson_id;
 ELSIF TG_TABLE_NAME='quiz_attempts' THEN student=NEW.user_id; SELECT course_id INTO course FROM public.quizzes WHERE id=NEW.quiz_id;
 ELSE student=NEW.student_id; SELECT course_id INTO course FROM public.assignments WHERE id=NEW.assignment_id; END IF;
 PERFORM public.issue_certificate_for(student,course);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.auto_issue_course_certificate() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER auto_certificate_progress AFTER INSERT OR UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.auto_issue_course_certificate();
CREATE TRIGGER auto_certificate_quiz AFTER INSERT ON public.quiz_attempts FOR EACH ROW EXECUTE FUNCTION public.auto_issue_course_certificate();
CREATE TRIGGER auto_certificate_grade AFTER INSERT OR UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.auto_issue_course_certificate();

CREATE FUNCTION public.certificate_download_record(certificate_id uuid) RETURNS public.certificates LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result public.certificates;
BEGIN
 SELECT * INTO result FROM public.certificates WHERE id=certificate_id AND user_id=auth.uid() AND revoked_at IS NULL AND validated_at IS NOT NULL AND course_id IS NOT NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Downloadable certificate not found'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.certificate_download_record(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.certificate_download_record(uuid) TO authenticated;
CREATE FUNCTION public.verify_certificate(token uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('certificate_number',certificate_number,'course_title',course_title,'issued_at',issued_at,
 'status',CASE WHEN revoked_at IS NOT NULL THEN 'revoked' WHEN course_id IS NULL THEN 'course_removed' WHEN validated_at IS NULL THEN 'pending_validation' ELSE 'valid' END)
 FROM public.certificates WHERE verification_token=token;
$$;
REVOKE ALL ON FUNCTION public.verify_certificate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(uuid) TO anon,authenticated;
CREATE FUNCTION public.admin_revoke_certificate(certificate_id uuid, reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF coalesce(length(trim(reason)),0) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'A reason is required'; END IF;
 UPDATE public.certificates SET revoked_at=coalesce(revoked_at,now()),revocation_reason=trim(reason) WHERE id=certificate_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Certificate not found'; END IF;
 INSERT INTO public.admin_audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'certificate.revoke',certificate_id::text,jsonb_build_object('reason',trim(reason)));
END $$;
REVOKE ALL ON FUNCTION public.admin_revoke_certificate(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_certificate(uuid,text) TO authenticated;
