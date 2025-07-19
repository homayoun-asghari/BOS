-- Add is_public column to notes table
ALTER TABLE public.notes 
ADD COLUMN is_public boolean DEFAULT false;

-- Drop existing RLS policies to recreate them with the new column
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can create notes" ON public.notes;

-- Recreate RLS policies to handle public/private notes
CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add a comment to document the new column
COMMENT ON COLUMN public.notes.is_public IS 'Indicates if the note is visible to other users';

-- Update the existing update policy to include the new column
CREATE OR REPLACE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id);

-- Add index for public notes if you plan to frequently query them
CREATE INDEX IF NOT EXISTS idx_notes_is_public ON public.notes(is_public) 
WHERE is_public = true;
