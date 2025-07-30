-- Add DELETE policy to the post-media bucket
-- This allows users to delete their own media files

-- Create policy to allow users to delete their own files from post-media bucket
BEGIN;

-- Create policy that allows users to delete their own files
CREATE POLICY "Allow users to delete their own media from post-media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'post-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

COMMIT;
