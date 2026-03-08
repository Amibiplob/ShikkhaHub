
-- 1. Notify enrolled students when a new assignment is created
CREATE OR REPLACE FUNCTION public.notify_new_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT e.user_id,
         'New Assignment: ' || NEW.title,
         COALESCE(NEW.description, 'A new assignment has been posted.'),
         'assignment',
         '/assignments/' || NEW.id
  FROM public.enrollments e
  WHERE e.course_id = NEW.course_id
    AND e.user_id != NEW.teacher_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_assignment
  AFTER INSERT ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_assignment();

-- 2. Notify student when their submission is graded
CREATE OR REPLACE FUNCTION public.notify_submission_graded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'submitted' AND NEW.status = 'graded' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.student_id,
      'Assignment Graded',
      'You received ' || COALESCE(NEW.marks::text, '?') || ' marks. ' || COALESCE(NEW.feedback, ''),
      'grade',
      '/assignments/' || NEW.assignment_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_submission_graded
  AFTER UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_submission_graded();

-- 3. Notify enrolled students when a live class is scheduled
CREATE OR REPLACE FUNCTION public.notify_new_live_class()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT e.user_id,
         'Live Class: ' || NEW.title,
         COALESCE(NEW.description, 'A new live class has been scheduled.'),
         'live_class',
         '/live/' || NEW.room_name
  FROM public.enrollments e
  WHERE e.course_id = NEW.course_id
    AND e.user_id != NEW.teacher_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_live_class
  AFTER INSERT ON public.live_classes
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_live_class();

-- 4. Notify teacher when a student enrolls in their course
CREATE OR REPLACE FUNCTION public.notify_new_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_teacher_id uuid;
  v_course_title text;
  v_student_name text;
BEGIN
  SELECT c.teacher_id, c.title INTO v_teacher_id, v_course_title
  FROM public.courses c WHERE c.id = NEW.course_id;

  SELECT COALESCE(p.full_name, 'A student') INTO v_student_name
  FROM public.profiles p WHERE p.user_id = NEW.user_id;

  IF v_teacher_id IS NOT NULL AND v_teacher_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_teacher_id,
      'New Enrollment',
      v_student_name || ' enrolled in ' || v_course_title,
      'enrollment',
      '/courses/' || NEW.course_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_enrollment
  AFTER INSERT ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_enrollment();

-- 5. Notify student when they earn a badge
CREATE OR REPLACE FUNCTION public.notify_badge_earned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_badge_name text;
BEGIN
  SELECT b.name INTO v_badge_name FROM public.badges b WHERE b.id = NEW.badge_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.user_id,
    'Badge Earned! 🏆',
    'You earned the "' || COALESCE(v_badge_name, 'Unknown') || '" badge!',
    'badge',
    '/achievements'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_badge_earned
  AFTER INSERT ON public.user_badges
  FOR EACH ROW EXECUTE FUNCTION public.notify_badge_earned();
