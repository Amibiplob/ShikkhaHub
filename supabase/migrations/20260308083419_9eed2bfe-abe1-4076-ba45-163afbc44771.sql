
-- Admins can view all user_roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all enrollments
CREATE POLICY "Admins can view all enrollments" ON public.enrollments
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete enrollments
CREATE POLICY "Admins can delete enrollments" ON public.enrollments
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all courses (including unpublished)
CREATE POLICY "Admins can view all courses" ON public.courses
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete courses
CREATE POLICY "Admins can delete courses" ON public.courses
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all live classes
CREATE POLICY "Admins can view all live classes" ON public.live_classes
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage user roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
