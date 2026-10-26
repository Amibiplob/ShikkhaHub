-- Extend existing tutoring records; approved is the stored confirmed state.
ALTER TABLE public.tutor_slots ADD COLUMN timezone text NOT NULL DEFAULT 'UTC';
ALTER TABLE public.tutor_slots ADD COLUMN cancelled_at timestamptz;
ALTER TABLE public.tutor_slots ADD COLUMN is_reserved boolean NOT NULL DEFAULT false;
UPDATE public.tutor_slots s SET is_reserved=true WHERE EXISTS(SELECT 1 FROM public.tutoring_requests r WHERE r.slot_id=s.id AND r.status='approved');
ALTER TABLE public.tutoring_requests DROP CONSTRAINT tutoring_requests_status_check;
ALTER TABLE public.tutoring_requests ADD CONSTRAINT tutoring_requests_status_check CHECK(status IN ('pending','approved','rejected','cancelled','completed'));
ALTER TABLE public.tutoring_requests ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.tutoring_requests ADD COLUMN decision_note text;
CREATE INDEX tutoring_requests_student_status ON public.tutoring_requests(student_id,status,created_at DESC);
CREATE INDEX tutor_slots_teacher_time ON public.tutor_slots(teacher_id,starts_at) WHERE cancelled_at IS NULL;
DROP TRIGGER guard_tutoring_request ON public.tutoring_requests;
REVOKE INSERT,UPDATE,DELETE ON public.tutor_slots,public.tutoring_requests FROM authenticated;
CREATE POLICY "Admins inspect tutoring" ON public.tutoring_requests FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.tutor_profiles (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
 expertise text NOT NULL DEFAULT '' CHECK(length(expertise)<=500),
 qualifications text NOT NULL DEFAULT '' CHECK(length(qualifications)<=1500), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tutor_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.tutor_profiles TO authenticated;
GRANT SELECT ON public.tutor_profiles TO anon;
CREATE POLICY "Approved teacher information" ON public.tutor_profiles FOR SELECT USING(public.has_role(user_id,'teacher'));
CREATE POLICY "Teachers insert own details" ON public.tutor_profiles FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND public.has_role(auth.uid(),'teacher'));
CREATE POLICY "Teachers update own details" ON public.tutor_profiles FOR UPDATE TO authenticated USING(user_id=auth.uid() AND public.has_role(auth.uid(),'teacher')) WITH CHECK(user_id=auth.uid());

CREATE FUNCTION public.save_tutor_slot(slot_id uuid, subject text, starts timestamptz, duration_minutes integer, zone text, repeat_weeks integer DEFAULT 1)
RETURNS SETOF public.tutor_slots LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE current_start timestamptz; current_end timestamptz; i integer; record public.tutor_slots;
BEGIN
 UPDATE public.application_locks SET version=version+1 WHERE key='tutoring';
 IF NOT public.has_role(auth.uid(),'teacher') THEN RAISE EXCEPTION 'Teacher access required'; END IF;
 IF subject IS NULL OR length(trim(subject)) NOT BETWEEN 3 AND 120 OR duration_minutes NOT BETWEEN 15 AND 180 OR repeat_weeks NOT BETWEEN 1 AND 8 OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=zone) THEN RAISE EXCEPTION 'Invalid availability or timezone'; END IF;
 IF starts IS NULL OR starts<=now() OR starts>now()+interval '1 year' THEN RAISE EXCEPTION 'Choose availability within the next year'; END IF;
 IF slot_id IS NOT NULL THEN
  IF repeat_weeks<>1 THEN RAISE EXCEPTION 'Edit one slot at a time'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.tutor_slots WHERE id=slot_id AND teacher_id=auth.uid() AND starts_at>now() AND cancelled_at IS NULL) THEN RAISE EXCEPTION 'Editable owned slot not found'; END IF;
  IF EXISTS(SELECT 1 FROM public.tutoring_requests WHERE tutoring_requests.slot_id=save_tutor_slot.slot_id) THEN RAISE EXCEPTION 'Slots with request history cannot be moved; cancel and create a new slot'; END IF;
 END IF;
 FOR i IN 0..repeat_weeks-1 LOOP
  current_start=((starts AT TIME ZONE zone)+make_interval(weeks=>i)) AT TIME ZONE zone;
  IF (current_start AT TIME ZONE zone) IS DISTINCT FROM ((starts AT TIME ZONE zone)+make_interval(weeks=>i)) OR ((current_start-interval '1 hour') AT TIME ZONE zone)=((starts AT TIME ZONE zone)+make_interval(weeks=>i)) OR ((current_start+interval '1 hour') AT TIME ZONE zone)=((starts AT TIME ZONE zone)+make_interval(weeks=>i)) THEN RAISE EXCEPTION 'Recurring availability crosses an ambiguous or nonexistent local time; choose another time or UTC'; END IF;
  current_end=current_start+make_interval(mins=>duration_minutes);
  IF EXISTS(SELECT 1 FROM public.tutor_slots s WHERE s.teacher_id=auth.uid() AND s.cancelled_at IS NULL AND s.id IS DISTINCT FROM slot_id AND tstzrange(s.starts_at,s.ends_at,'[)') && tstzrange(current_start,current_end,'[)')) THEN RAISE EXCEPTION 'Availability overlaps an existing slot'; END IF;
  IF slot_id IS NULL THEN INSERT INTO public.tutor_slots(teacher_id,subject,starts_at,ends_at,timezone) VALUES(auth.uid(),trim(subject),current_start,current_end,zone) RETURNING * INTO record;
  ELSE UPDATE public.tutor_slots SET subject=trim(save_tutor_slot.subject),starts_at=current_start,ends_at=current_end,timezone=zone WHERE id=slot_id RETURNING * INTO record; END IF;
  RETURN NEXT record;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.save_tutor_slot(uuid,text,timestamptz,integer,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_tutor_slot(uuid,text,timestamptz,integer,text,integer) TO authenticated;

CREATE FUNCTION public.cancel_tutor_slot(target_slot uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.application_locks SET version=version+1 WHERE key='tutoring';
 IF NOT EXISTS(SELECT 1 FROM public.tutor_slots WHERE id=target_slot AND teacher_id=auth.uid() AND starts_at>now() AND cancelled_at IS NULL) THEN RAISE EXCEPTION 'Future owned slot not found'; END IF;
 IF EXISTS(SELECT 1 FROM public.tutoring_requests WHERE slot_id=target_slot AND status='approved') THEN RAISE EXCEPTION 'Cancel the confirmed booking before removing availability'; END IF;
 UPDATE public.tutor_slots SET cancelled_at=now() WHERE id=target_slot;
 UPDATE public.tutoring_requests SET status='rejected',decision_note='Teacher removed availability',updated_at=now(),meeting_url=NULL WHERE slot_id=target_slot AND status='pending';
END $$;
REVOKE ALL ON FUNCTION public.cancel_tutor_slot(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancel_tutor_slot(uuid) TO authenticated;

CREATE FUNCTION public.request_tutoring(target_slot uuid, message text) RETURNS public.tutoring_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.tutor_slots; result public.tutoring_requests;
BEGIN
 UPDATE public.application_locks SET version=version+1 WHERE key='tutoring';
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO s FROM public.tutor_slots WHERE id=target_slot FOR UPDATE;
 IF NOT FOUND OR s.cancelled_at IS NOT NULL OR s.starts_at<=now() OR NOT public.has_role(s.teacher_id,'teacher') THEN RAISE EXCEPTION 'Future available slot not found'; END IF;
 IF s.teacher_id=auth.uid() THEN RAISE EXCEPTION 'You cannot book yourself'; END IF;
 IF message IS NULL OR length(trim(message)) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'Describe your learning request in 3 to 2000 characters'; END IF;
 IF EXISTS(SELECT 1 FROM public.tutoring_requests WHERE slot_id=target_slot AND status IN ('approved','completed')) THEN RAISE EXCEPTION 'This slot is already booked'; END IF;
 INSERT INTO public.tutoring_requests(slot_id,student_id,message) VALUES(target_slot,auth.uid(),trim(message)) RETURNING * INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.request_tutoring(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_tutoring(uuid,text) TO authenticated;

CREATE FUNCTION public.decide_tutoring(request_id uuid, action text, meeting_link text DEFAULT NULL, note text DEFAULT NULL)
RETURNS public.tutoring_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.tutoring_requests; s public.tutor_slots; owner boolean; admin boolean;
BEGIN
 UPDATE public.application_locks SET version=version+1 WHERE key='tutoring';
 SELECT * INTO r FROM public.tutoring_requests WHERE id=request_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
 SELECT * INTO s FROM public.tutor_slots WHERE id=r.slot_id FOR UPDATE;
 owner=auth.uid()=s.teacher_id AND public.has_role(auth.uid(),'teacher'); admin=public.has_role(auth.uid(),'admin');
 IF auth.uid() IS NULL OR NOT (owner OR admin OR auth.uid()=r.student_id) THEN RAISE EXCEPTION 'Booking access required'; END IF;
 IF note IS NOT NULL AND length(note)>500 THEN RAISE EXCEPTION 'Decision note is too long'; END IF;
 IF action='approve' THEN
  IF NOT owner OR r.status<>'pending' OR s.starts_at<=now() OR s.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'Only the teacher may confirm a future pending booking'; END IF;
  IF meeting_link IS NULL OR length(meeting_link)>2000 OR meeting_link !~ '^https://[^[:space:]]+$' THEN RAISE EXCEPTION 'An HTTPS meeting link is required'; END IF;
  IF EXISTS(SELECT 1 FROM public.tutoring_requests b JOIN public.tutor_slots t ON t.id=b.slot_id WHERE b.status='approved' AND b.id<>r.id AND
    (t.teacher_id=s.teacher_id OR b.student_id=r.student_id OR t.teacher_id=r.student_id OR b.student_id=s.teacher_id) AND tstzrange(t.starts_at,t.ends_at,'[)') && tstzrange(s.starts_at,s.ends_at,'[)')) THEN RAISE EXCEPTION 'Booking conflicts with a confirmed session'; END IF;
  UPDATE public.tutor_slots SET is_reserved=true WHERE id=s.id;
  UPDATE public.tutoring_requests SET status='approved',meeting_url=meeting_link,updated_at=now(),decision_note=note WHERE id=r.id RETURNING * INTO r;
  UPDATE public.tutoring_requests SET status='rejected',decision_note='Another request was confirmed',updated_at=now() WHERE slot_id=s.id AND id<>r.id AND status='pending';
 ELSIF action='reject' THEN
  IF NOT owner OR r.status<>'pending' THEN RAISE EXCEPTION 'Only the teacher may decline a pending booking'; END IF;
  UPDATE public.tutoring_requests SET status='rejected',meeting_url=NULL,decision_note=note,updated_at=now() WHERE id=r.id RETURNING * INTO r;
 ELSIF action='cancel' THEN
  IF r.status NOT IN ('pending','approved') OR s.starts_at<=now() THEN RAISE EXCEPTION 'Only future pending or confirmed bookings can be cancelled'; END IF;
  UPDATE public.tutor_slots SET is_reserved=false WHERE id=s.id;
  UPDATE public.tutoring_requests SET status='cancelled',meeting_url=NULL,decision_note=note,updated_at=now() WHERE id=r.id RETURNING * INTO r;
 ELSIF action='complete' THEN
  IF NOT owner OR r.status<>'approved' OR s.ends_at>now() THEN RAISE EXCEPTION 'Only the teacher may record completion after the session ends'; END IF;
  UPDATE public.tutoring_requests SET status='completed',meeting_url=NULL,decision_note=note,updated_at=now() WHERE id=r.id RETURNING * INTO r;
 ELSE RAISE EXCEPTION 'Invalid booking action'; END IF;
 INSERT INTO public.admin_audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'tutoring.'||action,r.id::text,jsonb_build_object('status',r.status));
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.decide_tutoring(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.decide_tutoring(uuid,text,text,text) TO authenticated;

CREATE FUNCTION public.participates_in_tutor_slot(target_slot uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.tutoring_requests WHERE slot_id=target_slot AND student_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION public.participates_in_tutor_slot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.participates_in_tutor_slot(uuid) TO anon,authenticated;
DROP POLICY "Public tutor availability" ON public.tutor_slots;
CREATE POLICY "Approved availability or participant history" ON public.tutor_slots FOR SELECT USING(
 (public.has_role(teacher_id,'teacher') AND cancelled_at IS NULL) OR teacher_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.participates_in_tutor_slot(id));
