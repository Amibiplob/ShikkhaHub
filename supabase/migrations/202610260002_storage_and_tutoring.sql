-- Private files require signed URLs. Existing public links must be migrated/reviewed.
UPDATE storage.buckets SET public=false, file_size_limit=52428800,
 allowed_mime_types=ARRAY['application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','video/mp4','video/webm']
 WHERE id='lesson-files';
UPDATE storage.buckets SET public=false, file_size_limit=10485760,
 allowed_mime_types=ARRAY['application/pdf','text/plain','application/zip','application/x-zip-compressed','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
 WHERE id='submissions';
UPDATE storage.buckets SET public=false WHERE id='class-recordings';
UPDATE storage.buckets SET file_size_limit=5242880,allowed_mime_types=ARRAY['image/png','image/jpeg','image/webp'] WHERE id IN ('avatars','course-thumbnails');

DROP POLICY "Authenticated users can upload lesson files" ON storage.objects;
DROP POLICY "Anyone can view lesson files" ON storage.objects;
DROP POLICY "Authenticated users can delete lesson files" ON storage.objects;
-- Paths: course UUID / random UUID.extension. Existing root-level files require
-- an explicit storage migration; they are intentionally not exposed by a fallback.
CREATE POLICY "Course owners upload lesson files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id='lesson-files' AND EXISTS(SELECT 1 FROM public.courses c WHERE c.id::text=split_part(name,'/',1) AND c.teacher_id=auth.uid()));
CREATE POLICY "Course participants read lesson files" ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id='lesson-files' AND EXISTS(SELECT 1 FROM public.courses c WHERE c.id::text=split_part(name,'/',1) AND public.can_access_course(c.id)));
CREATE POLICY "Course owners delete lesson files" ON storage.objects FOR DELETE TO authenticated USING (
 bucket_id='lesson-files' AND EXISTS(SELECT 1 FROM public.courses c WHERE c.id::text=split_part(name,'/',1) AND c.teacher_id=auth.uid()));
DROP POLICY "Students can upload submission files" ON storage.objects;
DROP POLICY "Authenticated users can view submission files" ON storage.objects;
DROP POLICY "Students can delete own submission files" ON storage.objects;
CREATE POLICY "Students upload own authorized submission files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id='submissions' AND split_part(name,'/',1)=auth.uid()::text AND EXISTS(SELECT 1 FROM public.assignments a
 WHERE a.id::text=split_part(name,'/',2) AND public.can_access_course(a.course_id)));
CREATE POLICY "Submission participants read files" ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id='submissions' AND (split_part(name,'/',1)=auth.uid()::text OR EXISTS(SELECT 1 FROM public.assignments a
 JOIN public.courses c ON c.id=a.course_id WHERE a.id::text=split_part(name,'/',2) AND c.teacher_id=auth.uid())));
CREATE POLICY "Students delete own submission files" ON storage.objects FOR DELETE TO authenticated USING (
 bucket_id='submissions' AND split_part(name,'/',1)=auth.uid()::text);
DROP POLICY "Teachers can upload thumbnails" ON storage.objects;
DROP POLICY "Users can delete own thumbnails" ON storage.objects;
CREATE POLICY "Course owners manage thumbnails" ON storage.objects FOR ALL TO authenticated USING (
 bucket_id='course-thumbnails' AND EXISTS(SELECT 1 FROM public.courses c WHERE c.id::text=split_part(name,'/',1) AND c.teacher_id=auth.uid())) WITH CHECK (
 bucket_id='course-thumbnails' AND EXISTS(SELECT 1 FROM public.courses c WHERE c.id::text=split_part(name,'/',1) AND c.teacher_id=auth.uid()));
DROP POLICY "Authenticated users can upload recordings" ON storage.objects;
DROP POLICY "Anyone can view recordings" ON storage.objects;
DROP POLICY "Teachers can delete own recordings" ON storage.objects;
CREATE POLICY "Recording owner uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id='class-recordings' AND EXISTS(SELECT 1 FROM public.live_classes lc WHERE lc.id::text=split_part(name,'/',1) AND lc.teacher_id=auth.uid()));
CREATE POLICY "Recording participants read" ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id='class-recordings' AND EXISTS(SELECT 1 FROM public.live_classes lc WHERE lc.id::text=split_part(name,'/',1) AND public.can_access_course(lc.course_id)));
CREATE POLICY "Recording owner deletes" ON storage.objects FOR DELETE TO authenticated USING (
 bucket_id='class-recordings' AND EXISTS(SELECT 1 FROM public.live_classes lc WHERE lc.id::text=split_part(name,'/',1) AND lc.teacher_id=auth.uid()));
DROP POLICY "Recordings viewable for published courses" ON public.class_recordings;
CREATE POLICY "Participants view recordings" ON public.class_recordings FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.live_classes lc WHERE lc.id=live_class_id AND public.can_access_course(lc.course_id)));
DROP POLICY "Teachers can insert recordings" ON public.class_recordings;
CREATE POLICY "Teachers can insert recordings" ON public.class_recordings FOR INSERT TO authenticated WITH CHECK (
 teacher_id=auth.uid() AND EXISTS(SELECT 1 FROM public.live_classes lc WHERE lc.id=live_class_id AND lc.teacher_id=auth.uid()));

-- Private tutoring MVP: teachers publish individual slots; an accepted request
-- reserves one slot. Students never receive other students' requests or links.
CREATE TABLE public.tutor_slots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), teacher_id uuid NOT NULL REFERENCES public.profiles(user_id),
 subject text NOT NULL CHECK(length(trim(subject)) BETWEEN 3 AND 120),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at>starts_at),
 UNIQUE(teacher_id,starts_at)
);
CREATE TABLE public.tutoring_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slot_id uuid NOT NULL REFERENCES public.tutor_slots(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES public.profiles(user_id), message text NOT NULL CHECK(length(trim(message)) BETWEEN 3 AND 2000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
 meeting_url text CHECK(meeting_url IS NULL OR meeting_url ~ '^https://[^[:space:]]+$'),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(slot_id,student_id)
);
CREATE UNIQUE INDEX tutor_slot_one_approved ON public.tutoring_requests(slot_id) WHERE status='approved';
ALTER TABLE public.tutor_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutoring_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.tutor_slots TO anon,authenticated;
GRANT INSERT,DELETE ON public.tutor_slots TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.tutoring_requests TO authenticated;
GRANT ALL ON public.tutor_slots,public.tutoring_requests TO service_role;
CREATE POLICY "Public tutor availability" ON public.tutor_slots FOR SELECT USING(true);
CREATE POLICY "Teachers offer availability" ON public.tutor_slots FOR INSERT TO authenticated WITH CHECK(
 teacher_id=auth.uid() AND public.has_role(auth.uid(),'teacher') AND starts_at>now());
CREATE POLICY "Teachers delete unused slots" ON public.tutor_slots FOR DELETE TO authenticated USING(
 teacher_id=auth.uid() AND NOT EXISTS(SELECT 1 FROM public.tutoring_requests r WHERE r.slot_id=tutor_slots.id AND r.status='approved'));
CREATE POLICY "Participants view tutoring requests" ON public.tutoring_requests FOR SELECT TO authenticated USING(
 student_id=auth.uid() OR EXISTS(SELECT 1 FROM public.tutor_slots s WHERE s.id=slot_id AND s.teacher_id=auth.uid()));
CREATE POLICY "Students request future tutoring" ON public.tutoring_requests FOR INSERT TO authenticated WITH CHECK(
 student_id=auth.uid() AND status='pending' AND meeting_url IS NULL AND EXISTS(SELECT 1 FROM public.tutor_slots s
 WHERE s.id=slot_id AND s.teacher_id<>auth.uid() AND s.starts_at>now()));
CREATE POLICY "Participants update tutoring requests" ON public.tutoring_requests FOR UPDATE TO authenticated USING(
 student_id=auth.uid() OR EXISTS(SELECT 1 FROM public.tutor_slots s WHERE s.id=slot_id AND s.teacher_id=auth.uid()));
CREATE FUNCTION public.guard_tutoring_request() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid; starts timestamptz;
BEGIN
 SELECT teacher_id,starts_at INTO owner_id,starts FROM public.tutor_slots WHERE id=NEW.slot_id FOR UPDATE;
 IF TG_OP='UPDATE' THEN
   IF NEW.slot_id<>OLD.slot_id OR NEW.student_id<>OLD.student_id OR NEW.message<>OLD.message THEN RAISE EXCEPTION 'Request identity cannot change'; END IF;
   IF OLD.status<>'pending' THEN RAISE EXCEPTION 'This request has already been resolved'; END IF;
   IF auth.uid()=owner_id THEN
     IF NEW.status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Choose approve or reject'; END IF;
     IF NEW.status='approved' AND (starts<=now() OR NEW.meeting_url IS NULL) THEN RAISE EXCEPTION 'A future slot and HTTPS meeting link are required'; END IF;
     IF NEW.status='rejected' THEN NEW.meeting_url=NULL; END IF;
   ELSIF NEW.status<>'cancelled' OR NEW.meeting_url IS NOT NULL THEN RAISE EXCEPTION 'Students may only cancel pending requests'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_tutoring_request BEFORE INSERT OR UPDATE ON public.tutoring_requests FOR EACH ROW EXECUTE FUNCTION public.guard_tutoring_request();
REVOKE ALL ON FUNCTION public.guard_tutoring_request() FROM PUBLIC,anon,authenticated;
