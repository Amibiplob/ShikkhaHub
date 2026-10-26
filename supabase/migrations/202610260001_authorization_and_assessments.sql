-- Additive repair; apply to an isolated Supabase project before production review.
-- Legacy files remain unchanged. No production connection is used by local tests.

-- Bring the separately maintained Drizzle teacher-request migration into the
-- canonical Supabase history without deleting or recreating existing records.
CREATE TABLE IF NOT EXISTS public.teacher_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
  full_name text, email text, status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS teacher_requests_one_pending ON public.teacher_requests(user_id) WHERE status='pending';
ALTER TABLE public.teacher_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can submit their own teacher request" ON public.teacher_requests;
DROP POLICY IF EXISTS "Users can view their own request; admins can view all" ON public.teacher_requests;
DROP POLICY IF EXISTS "Admins can review teacher requests" ON public.teacher_requests;
CREATE POLICY "Users can submit their own teacher request" ON public.teacher_requests FOR INSERT TO authenticated
  WITH CHECK (user_id=auth.uid() AND status='pending');
CREATE POLICY "Users can view their own request; admins can view all" ON public.teacher_requests FOR SELECT TO authenticated
  USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
-- Reviews use an atomic RPC; direct updates cannot grant a role.
GRANT SELECT, INSERT ON public.teacher_requests TO authenticated;
REVOKE UPDATE ON public.teacher_requests FROM authenticated;
GRANT ALL ON public.teacher_requests TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.profiles(user_id,full_name,avatar_url)
    VALUES(NEW.id,NEW.raw_user_meta_data->>'full_name',NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'student') ON CONFLICT DO NOTHING;
  IF NEW.raw_user_meta_data->>'wants_teacher' = 'true' THEN
    INSERT INTO public.teacher_requests(user_id,full_name,email)
      VALUES(NEW.id,NEW.raw_user_meta_data->>'full_name',NEW.email);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.review_teacher_request(request_id uuid, approve boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE req public.teacher_requests;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  SELECT * INTO req FROM public.teacher_requests WHERE id=request_id AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pending request not found'; END IF;
  IF approve THEN INSERT INTO public.user_roles(user_id,role) VALUES(req.user_id,'teacher') ON CONFLICT DO NOTHING; END IF;
  UPDATE public.teacher_requests SET status=CASE WHEN approve THEN 'approved' ELSE 'dismissed' END,updated_at=now() WHERE id=request_id;
END $$;
REVOKE ALL ON FUNCTION public.review_teacher_request(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_teacher_request(uuid,boolean) TO authenticated;

CREATE FUNCTION public.can_access_course(target_course uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.courses c WHERE c.id=target_course AND (
    c.teacher_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR
    (c.is_published AND EXISTS(SELECT 1 FROM public.enrollments e WHERE e.course_id=c.id AND e.user_id=auth.uid()))))
$$;
REVOKE ALL ON FUNCTION public.can_access_course(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_course(uuid) TO anon,authenticated;

DROP POLICY "Users can enroll" ON public.enrollments;
CREATE POLICY "Users can enroll" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (
  user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.courses c WHERE c.id=course_id AND c.is_published));
ALTER TABLE public.lessons ADD COLUMN is_free_preview boolean NOT NULL DEFAULT false;
DROP POLICY "Lessons viewable with module" ON public.lessons;
CREATE POLICY "Lessons viewable with module" ON public.lessons FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.modules m JOIN public.courses c ON c.id=m.course_id WHERE m.id=module_id
    AND (public.can_access_course(c.id) OR (is_free_preview AND c.is_published))));
DROP POLICY "Users can insert own progress" ON public.lesson_progress;
DROP POLICY "Users can update own progress" ON public.lesson_progress;
CREATE POLICY "Users can insert own progress" ON public.lesson_progress FOR INSERT TO authenticated WITH CHECK (
  user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id=l.module_id
    WHERE l.id=lesson_id AND public.can_access_course(m.course_id)));
CREATE POLICY "Users can update own progress" ON public.lesson_progress FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (
  user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id=l.module_id
    WHERE l.id=lesson_id AND public.can_access_course(m.course_id)));
CREATE POLICY "Teachers can view course progress" ON public.lesson_progress FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id=l.module_id JOIN public.courses c ON c.id=m.course_id
    WHERE l.id=lesson_id AND c.teacher_id=auth.uid()));

-- Answer keys must never be readable via the ordinary REST table endpoint.
REVOKE SELECT ON public.quiz_questions FROM anon,authenticated;
GRANT SELECT(id,quiz_id,question,options,points,sort_order) ON public.quiz_questions TO authenticated;
DROP POLICY "Questions viewable with quiz" ON public.quiz_questions;
CREATE POLICY "Questions viewable with quiz" ON public.quiz_questions FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.quizzes q WHERE q.id=quiz_id AND public.can_access_course(q.course_id)));
CREATE FUNCTION public.read_quiz_questions(target_quiz uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; owner_id uuid;
BEGIN
  SELECT q.course_id,c.teacher_id INTO cid,owner_id FROM public.quizzes q JOIN public.courses c ON c.id=q.course_id WHERE q.id=target_quiz;
  IF NOT coalesce(public.can_access_course(cid),false) THEN RAISE EXCEPTION 'Course access required'; END IF;
  RETURN coalesce((SELECT jsonb_agg(CASE WHEN owner_id=auth.uid() OR public.has_role(auth.uid(),'admin')
    THEN to_jsonb(q) ELSE to_jsonb(q)-'correct_answer' END ORDER BY sort_order)
    FROM public.quiz_questions q WHERE quiz_id=target_quiz),'[]');
END $$;
REVOKE ALL ON FUNCTION public.read_quiz_questions(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_quiz_questions(uuid) TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.quiz_attempts FROM authenticated;
DROP POLICY "Users can submit attempts" ON public.quiz_attempts;
CREATE FUNCTION public.submit_quiz(target_quiz uuid, submitted_answers jsonb) RETURNS public.quiz_attempts
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; threshold integer; earned integer; total integer; attempt public.quiz_attempts;
BEGIN
  SELECT course_id,pass_percentage INTO cid,threshold FROM public.quizzes WHERE id=target_quiz;
  IF NOT coalesce(public.can_access_course(cid),false) THEN RAISE EXCEPTION 'Course access required'; END IF;
  IF submitted_answers IS NULL OR jsonb_typeof(submitted_answers) <> 'object' THEN RAISE EXCEPTION 'Answers must be an object'; END IF;
  SELECT coalesce(sum(points),0),coalesce(sum(CASE WHEN submitted_answers->id::text=to_jsonb(correct_answer) THEN points ELSE 0 END),0)
    INTO total,earned FROM public.quiz_questions WHERE quiz_id=target_quiz;
  IF total=0 THEN RAISE EXCEPTION 'This quiz has no questions'; END IF;
  IF EXISTS(SELECT 1 FROM public.quiz_questions q WHERE q.quiz_id=target_quiz AND
    (NOT submitted_answers ? q.id::text OR jsonb_typeof(submitted_answers->q.id::text)<>'number' OR
     NOT EXISTS(SELECT 1 FROM generate_series(0,jsonb_array_length(q.options)-1) i WHERE submitted_answers->q.id::text=to_jsonb(i))))
    OR EXISTS(SELECT 1 FROM jsonb_object_keys(submitted_answers) k WHERE NOT EXISTS(SELECT 1 FROM public.quiz_questions q WHERE q.quiz_id=target_quiz AND q.id::text=k))
    THEN RAISE EXCEPTION 'Answer every question with a valid option'; END IF;
  INSERT INTO public.quiz_attempts(quiz_id,user_id,answers,score,total_points,passed)
    VALUES(target_quiz,auth.uid(),submitted_answers,earned,total,earned*100.0/total>=threshold) RETURNING * INTO attempt;
  RETURN attempt;
END $$;
REVOKE ALL ON FUNCTION public.submit_quiz(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz(uuid,jsonb) TO authenticated;
ALTER TABLE public.quiz_questions ADD CONSTRAINT quiz_question_valid CHECK (
  jsonb_typeof(options)='array' AND jsonb_array_length(options)>=2 AND correct_answer>=0 AND correct_answer<jsonb_array_length(options) AND points>0) NOT VALID;
ALTER TABLE public.quizzes ADD CONSTRAINT quiz_pass_valid CHECK(pass_percentage BETWEEN 0 AND 100) NOT VALID;

-- Students submit content; only the course owner grades it.
DROP POLICY "Students can submit" ON public.submissions;
CREATE POLICY "Students can submit" ON public.submissions FOR INSERT TO authenticated WITH CHECK (
  student_id=auth.uid() AND EXISTS(SELECT 1 FROM public.assignments a WHERE a.id=assignment_id AND public.can_access_course(a.course_id)));
CREATE FUNCTION public.guard_submission() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid; max_score integer;
BEGIN
  SELECT c.teacher_id,a.max_marks INTO owner_id,max_score FROM public.assignments a JOIN public.courses c ON c.id=a.course_id WHERE a.id=NEW.assignment_id;
  IF TG_OP='UPDATE' AND (NEW.assignment_id<>OLD.assignment_id OR NEW.student_id<>OLD.student_id) THEN RAISE EXCEPTION 'Submission identity cannot change'; END IF;
  IF NEW.submission_type NOT IN ('github','url','file') OR (NEW.submission_type IN ('github','url') AND NEW.content !~ '^https://[^[:space:]]+$') THEN RAISE EXCEPTION 'Invalid submission content'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'submitted' OR NEW.marks IS NOT NULL OR NEW.feedback IS NOT NULL OR NEW.reviewed_at IS NOT NULL THEN RAISE EXCEPTION 'Students cannot grade submissions'; END IF;
  ELSIF auth.uid() IS DISTINCT FROM owner_id THEN
    IF OLD.status<>'submitted' OR NEW.status IS DISTINCT FROM OLD.status OR NEW.marks IS DISTINCT FROM OLD.marks
      OR NEW.feedback IS DISTINCT FROM OLD.feedback OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN RAISE EXCEPTION 'Only the course owner can grade submissions'; END IF;
  ELSE
    IF NEW.content IS DISTINCT FROM OLD.content OR NEW.file_url IS DISTINCT FROM OLD.file_url OR NEW.submission_type<>OLD.submission_type THEN RAISE EXCEPTION 'Teachers cannot change student content'; END IF;
  END IF;
  IF NEW.marks IS NOT NULL AND (NEW.marks<0 OR NEW.marks>max_score) THEN RAISE EXCEPTION 'Marks outside assignment range'; END IF;
  IF NEW.status NOT IN ('submitted','graded') THEN RAISE EXCEPTION 'Invalid submission status'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_submission BEFORE INSERT OR UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.guard_submission();
REVOKE ALL ON FUNCTION public.guard_submission() FROM PUBLIC,anon,authenticated;
-- Detect duplicate legacy submissions rather than silently deleting academic work.
CREATE UNIQUE INDEX submissions_one_per_student ON public.submissions(assignment_id,student_id);
ALTER TABLE public.submissions ADD CONSTRAINT submissions_student_id_fkey FOREIGN KEY(student_id) REFERENCES public.profiles(user_id) NOT VALID;

-- Cross-course parent IDs must not attach a reply to a private discussion.
CREATE FUNCTION public.guard_discussion_parent() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.parent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.course_discussions p WHERE p.id=NEW.parent_id AND p.course_id=NEW.course_id) THEN
   RAISE EXCEPTION 'Reply must belong to the same course'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_discussion_parent BEFORE INSERT OR UPDATE ON public.course_discussions FOR EACH ROW EXECUTE FUNCTION public.guard_discussion_parent();
REVOKE ALL ON FUNCTION public.guard_discussion_parent() FROM PUBLIC,anon,authenticated;

-- Lock admin role mutations, including UPDATE paths that previously bypassed DELETE.
CREATE OR REPLACE FUNCTION public.prevent_admin_lockout() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF OLD.role='admin' AND (TG_OP='DELETE' OR NEW.role<>'admin' OR NEW.user_id<>OLD.user_id) THEN
    PERFORM pg_advisory_xact_lock(163749501);
    IF OLD.user_id=auth.uid() THEN RAISE EXCEPTION 'You cannot remove your own admin role'; END IF;
    IF (SELECT count(*) FROM public.user_roles WHERE role='admin')<=1 THEN RAISE EXCEPTION 'At least one admin must remain'; END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER prevent_admin_lockout_trigger ON public.user_roles;
CREATE TRIGGER prevent_admin_lockout_trigger BEFORE DELETE OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_lockout();

-- Certificates already exist, but a client percentage is not proof of completion.
DROP POLICY "System can insert certificates" ON public.certificates;
CREATE POLICY "System can insert certificates" ON public.certificates FOR INSERT TO authenticated WITH CHECK (
  user_id=auth.uid() AND public.can_access_course(course_id)
  AND EXISTS(SELECT 1 FROM public.modules m JOIN public.lessons l ON l.module_id=m.id WHERE m.course_id=certificates.course_id)
  AND NOT EXISTS(SELECT 1 FROM public.modules m JOIN public.lessons l ON l.module_id=m.id WHERE m.course_id=certificates.course_id AND NOT EXISTS(
    SELECT 1 FROM public.lesson_progress p WHERE p.lesson_id=l.id AND p.user_id=auth.uid() AND p.completed)));

-- Live metadata is course-scoped. Realtime private topic policy is in migration 3.
DROP POLICY "Anyone can view live classes" ON public.live_classes;
CREATE POLICY "Course participants can view live classes" ON public.live_classes FOR SELECT TO authenticated USING(public.can_access_course(course_id));
CREATE OR REPLACE FUNCTION public.expire_old_live_classes() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.live_classes SET status='expired',updated_at=now()
  WHERE status IN ('scheduled','live') AND scheduled_at + make_interval(mins=>coalesce(duration_minutes,60)) + interval '1 day' < now();
END $$;

ALTER TABLE public.course_reviews ADD CONSTRAINT course_reviews_user_id_fkey FOREIGN KEY(user_id) REFERENCES public.profiles(user_id) NOT VALID;
