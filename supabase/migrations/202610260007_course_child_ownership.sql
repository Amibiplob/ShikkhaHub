CREATE FUNCTION public.guard_course_child_owner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.courses c WHERE c.id=NEW.course_id AND c.teacher_id=NEW.teacher_id) THEN
  RAISE EXCEPTION 'Course and teacher ownership must match';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_assignment_owner BEFORE INSERT OR UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.guard_course_child_owner();
CREATE TRIGGER guard_live_owner BEFORE INSERT OR UPDATE ON public.live_classes FOR EACH ROW EXECUTE FUNCTION public.guard_course_child_owner();
REVOKE ALL ON FUNCTION public.guard_course_child_owner() FROM PUBLIC,anon,authenticated;
