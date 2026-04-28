
DROP POLICY "Teachers can create courses" ON public.courses;
CREATE POLICY "Teachers and admins can create courses" ON public.courses
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = teacher_id AND (
    has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY "Teachers can update own courses" ON public.courses;
CREATE POLICY "Teachers and admins can update courses" ON public.courses
FOR UPDATE TO authenticated
USING (
  auth.uid() = teacher_id OR has_role(auth.uid(), 'admin'::app_role)
);
