
-- Create storage bucket for course thumbnails
INSERT INTO storage.buckets (id, name, public) VALUES ('course-thumbnails', 'course-thumbnails', true);

-- Allow authenticated users to upload course thumbnails
CREATE POLICY "Teachers can upload thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-thumbnails');

-- Allow anyone to view course thumbnails
CREATE POLICY "Anyone can view course thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-thumbnails');

-- Allow teachers to delete their own thumbnails
CREATE POLICY "Users can delete own thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-thumbnails');

-- Create certificates table
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  certificate_number text NOT NULL DEFAULT ('CERT-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  UNIQUE(user_id, course_id)
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own certificates"
ON public.certificates FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert certificates"
ON public.certificates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all certificates"
ON public.certificates FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
