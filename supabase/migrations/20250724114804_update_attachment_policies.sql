-- Update storage policies for notes-attachments bucket to support both path formats

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated view" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;

-- Recreate policies with support for both path formats
CREATE POLICY "Allow users to upload to their own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'notes-attachments' AND 
    (
      -- Support for user_id/... format
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- Support for user_id/note_id/filename format
      auth.uid()::text = split_part(name, '/', 1)
    )
  );

CREATE POLICY "Allow users to view their own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'notes-attachments' AND 
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.uid()::text = split_part(name, '/', 1)
    )
  );

CREATE POLICY "Allow users to delete their own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'notes-attachments' AND 
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.uid()::text = split_part(name, '/', 1)
    )
  );

-- Add explicit update policy
CREATE POLICY "Allow users to update their own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'notes-attachments' AND 
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.uid()::text = split_part(name, '/', 1)
    )
  )
  WITH CHECK (
    bucket_id = 'notes-attachments' AND 
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.uid()::text = split_part(name, '/', 1)
    )
  );
