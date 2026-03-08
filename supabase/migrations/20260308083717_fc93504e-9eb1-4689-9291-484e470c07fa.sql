
-- Assignments table
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  max_marks integer DEFAULT 100,
  submission_types text[] DEFAULT ARRAY['github', 'file', 'url'],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Viewable if course is published or user is teacher
CREATE POLICY "Assignments viewable with course" ON public.assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = assignments.course_id
      AND (c.is_published = true OR c.teacher_id = auth.uid())
    )
  );

CREATE POLICY "Teachers can create assignments" ON public.assignments
  FOR INSERT WITH CHECK (
    auth.uid() = teacher_id
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid())
  );

CREATE POLICY "Teachers can update assignments" ON public.assignments
  FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete assignments" ON public.assignments
  FOR DELETE USING (auth.uid() = teacher_id);

CREATE POLICY "Admins can view all assignments" ON public.assignments
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Submissions table
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  student_id uuid NOT NULL,
  submission_type text NOT NULL,
  content text NOT NULL,
  file_url text,
  marks integer,
  feedback text,
  status text NOT NULL DEFAULT 'submitted',
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Students can view own submissions
CREATE POLICY "Students can view own submissions" ON public.submissions
  FOR SELECT USING (auth.uid() = student_id);

-- Students can create submissions
CREATE POLICY "Students can submit" ON public.submissions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can update own submissions (resubmit)
CREATE POLICY "Students can update own submissions" ON public.submissions
  FOR UPDATE USING (auth.uid() = student_id AND status = 'submitted');

-- Teachers can view submissions for their assignments
CREATE POLICY "Teachers can view submissions" ON public.submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a WHERE a.id = submissions.assignment_id AND a.teacher_id = auth.uid()
    )
  );

-- Teachers can update submissions (grade/feedback)
CREATE POLICY "Teachers can review submissions" ON public.submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assignments a WHERE a.id = submissions.assignment_id AND a.teacher_id = auth.uid()
    )
  );

-- Admins
CREATE POLICY "Admins can view all submissions" ON public.submissions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
