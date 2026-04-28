
-- Create storage bucket for submission files
INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', true);

-- RLS: Students can upload to their own folder
CREATE POLICY "Students can upload submission files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Anyone authenticated can view submission files
CREATE POLICY "Authenticated users can view submission files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'submissions');

-- RLS: Students can delete their own files
CREATE POLICY "Students can delete own submission files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);
