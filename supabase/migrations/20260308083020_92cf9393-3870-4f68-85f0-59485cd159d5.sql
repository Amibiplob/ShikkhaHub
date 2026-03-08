
-- Live classes table
CREATE TABLE public.live_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  room_name text NOT NULL UNIQUE,
  scheduled_at timestamp with time zone NOT NULL,
  duration_minutes integer DEFAULT 60,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;

-- Anyone can view live classes for published courses or own courses
CREATE POLICY "Anyone can view live classes" ON public.live_classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = live_classes.course_id
      AND (c.is_published = true OR c.teacher_id = auth.uid())
    )
  );

-- Teachers can create live classes for their courses
CREATE POLICY "Teachers can create live classes" ON public.live_classes
  FOR INSERT WITH CHECK (
    auth.uid() = teacher_id
    AND EXISTS (
      SELECT 1 FROM courses c WHERE c.id = live_classes.course_id AND c.teacher_id = auth.uid()
    )
  );

-- Teachers can update their live classes
CREATE POLICY "Teachers can update live classes" ON public.live_classes
  FOR UPDATE USING (auth.uid() = teacher_id);

-- Teachers can delete their live classes
CREATE POLICY "Teachers can delete live classes" ON public.live_classes
  FOR DELETE USING (auth.uid() = teacher_id);

-- Updated at trigger
CREATE TRIGGER update_live_classes_updated_at
  BEFORE UPDATE ON public.live_classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
