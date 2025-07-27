-- Add RLS policies for notes-attachments-public bucket
-- This bucket is for public attachments that can be accessed without authentication

-- Allow public read access to files in the public bucket
CREATE POLICY "Allow public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'notes-attachments-public');

-- Allow authenticated users to upload to the public bucket
CREATE POLICY "Allow authenticated upload to public bucket"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notes-attachments-public');

-- Allow authenticated users to update files in the public bucket
CREATE POLICY "Allow authenticated update in public bucket"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'notes-attachments-public');

-- Allow authenticated users to delete files from the public bucket
CREATE POLICY "Allow authenticated delete from public bucket"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'notes-attachments-public');
