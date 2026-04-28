
-- Course discussions table
CREATE TABLE public.course_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.course_discussions(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.course_discussions ENABLE ROW LEVEL SECURITY;

-- Anyone enrolled or the teacher can view discussions
CREATE POLICY "Enrolled users and teacher can view discussions"
ON public.course_discussions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses c WHERE c.id = course_discussions.course_id
    AND (c.teacher_id = auth.uid() OR c.is_published = true)
  )
  AND (
    EXISTS (SELECT 1 FROM enrollments e WHERE e.user_id = auth.uid() AND e.course_id = course_discussions.course_id)
    OR EXISTS (SELECT 1 FROM courses c WHERE c.id = course_discussions.course_id AND c.teacher_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Enrolled users and teacher can post
CREATE POLICY "Enrolled users can post discussions"
ON public.course_discussions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (SELECT 1 FROM enrollments e WHERE e.user_id = auth.uid() AND e.course_id = course_discussions.course_id)
    OR EXISTS (SELECT 1 FROM courses c WHERE c.id = course_discussions.course_id AND c.teacher_id = auth.uid())
  )
);

-- Users can delete own discussions
CREATE POLICY "Users can delete own discussions"
ON public.course_discussions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Teachers can delete any discussion in their course
CREATE POLICY "Teachers can delete course discussions"
ON public.course_discussions FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM courses c WHERE c.id = course_discussions.course_id AND c.teacher_id = auth.uid())
);
