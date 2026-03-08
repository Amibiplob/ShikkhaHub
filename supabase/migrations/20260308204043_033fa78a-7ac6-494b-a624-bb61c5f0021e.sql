
-- Create storage bucket for class recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('class-recordings', 'class-recordings', true);

-- Create class_recordings table
CREATE TABLE public.class_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_class_id UUID REFERENCES public.live_classes(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.class_recordings ENABLE ROW LEVEL SECURITY;

-- Anyone can view recordings for published courses
CREATE POLICY "Recordings viewable for published courses"
ON public.class_recordings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM live_classes lc
    JOIN courses c ON c.id = lc.course_id
    WHERE lc.id = class_recordings.live_class_id
    AND (c.is_published = true OR c.teacher_id = auth.uid())
  )
);

-- Teachers can insert their own recordings
CREATE POLICY "Teachers can insert recordings"
ON public.class_recordings FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

-- Teachers can delete their own recordings
CREATE POLICY "Teachers can delete recordings"
ON public.class_recordings FOR DELETE
USING (auth.uid() = teacher_id);

-- Storage RLS for class-recordings bucket
CREATE POLICY "Authenticated users can upload recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'class-recordings');

CREATE POLICY "Anyone can view recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'class-recordings');

CREATE POLICY "Teachers can delete own recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'class-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);
