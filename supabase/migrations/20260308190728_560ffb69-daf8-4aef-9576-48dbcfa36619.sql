
-- Create storage bucket for lesson files (videos, documents, etc.)
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-files', 'lesson-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload lesson files
CREATE POLICY "Authenticated users can upload lesson files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lesson-files');

-- Allow anyone to view lesson files
CREATE POLICY "Anyone can view lesson files"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-files');

-- Allow authenticated users to delete their own lesson files
CREATE POLICY "Authenticated users can delete lesson files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lesson-files');
