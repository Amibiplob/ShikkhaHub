-- Create FK from courses.teacher_id to profiles.user_id for PostgREST joins
ALTER TABLE public.courses ADD CONSTRAINT courses_teacher_id_profiles_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
