-- Update the profiles RLS policy to allow viewing profile data for all participants in conversations
DROP POLICY IF EXISTS "Users can view message senders' profiles" ON public.profiles;

-- New policy that allows viewing profiles of users who are in the same conversations
CREATE POLICY "Users can view profiles of conversation participants"
ON public.profiles
FOR SELECT
USING (
  -- User can see profiles of other users they have conversations with
  EXISTS (
    SELECT 1 
    FROM public.chat_participants cp1
    JOIN public.chat_participants cp2 ON cp1.room_id = cp2.room_id
    WHERE cp1.user_id = auth.uid()
    AND cp2.user_id = profiles.id
    AND cp1.left_at IS NULL
    AND cp2.left_at IS NULL
  )
  -- Or the user's own profile
  OR profiles.id = auth.uid()
);
