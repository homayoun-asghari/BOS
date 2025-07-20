-- Enable RLS on post_likes table
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Allow users to view all likes (for like counts)
CREATE POLICY "Enable read access for all users"
ON public.post_likes
AS PERMISSIVE FOR SELECT
TO public
USING (true);

-- Allow authenticated users to insert their own likes
CREATE POLICY "Enable insert for authenticated users"
ON public.post_likes
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own likes
CREATE POLICY "Enable delete for users on their own likes"
ON public.post_likes
AS PERMISSIVE FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to see their own likes (for checking if they've liked a post)
CREATE POLICY "Enable read access for users on their own likes"
ON public.post_likes
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
