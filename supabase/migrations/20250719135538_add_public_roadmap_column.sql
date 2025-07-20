-- Add is_public column to roadmaps table
ALTER TABLE public.roadmaps 
ADD COLUMN is_public boolean DEFAULT false;

-- Update RLS to allow public read access
DROP POLICY IF EXISTS "Public roadmaps are viewable by everyone" ON public.roadmaps;
CREATE POLICY "Public roadmaps are viewable by everyone" 
  ON public.roadmaps 
  FOR SELECT 
  USING (is_public = true);

