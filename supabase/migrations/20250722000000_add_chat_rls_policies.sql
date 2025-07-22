-- Enable RLS on chat_rooms
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;

-- Allow users to see rooms they're participants in
CREATE POLICY "Users can view rooms they participate in"
ON public.chat_rooms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.room_id = chat_rooms.id 
    AND cp.user_id = auth.uid()
    AND cp.left_at IS NULL
  )
);

-- Enable RLS on chat_participants
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own participant records" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can insert participants for their chats" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can update their own participant records" ON public.chat_participants;

-- Allow users to see their own participants records
CREATE POLICY "Users can view their own participant records"
ON public.chat_participants
FOR SELECT
USING (user_id = auth.uid());

-- Allow users to insert participants (for group chats)
CREATE POLICY "Users can insert participants for their chats"
ON public.chat_participants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.room_id = chat_participants.room_id
    AND cp.user_id = auth.uid()
    AND cp.left_at IS NULL
  )
);

-- Allow users to update their own participant records (like marking as read)
CREATE POLICY "Users can update their own participant records"
ON public.chat_participants
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Enable RLS on chat_messages if not already enabled
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;

-- Allow users to see messages in rooms they participate in
CREATE POLICY "Users can view messages in their rooms"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.room_id = chat_messages.room_id
    AND cp.user_id = auth.uid()
    AND cp.left_at IS NULL
  )
);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view conversation participants' profiles" ON public.profiles;

-- Allow users to see profiles of other users they have conversations with
CREATE POLICY "Users can view conversation participants' profiles"
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

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.chat_messages;

-- Allow users to insert messages in rooms they participate in
CREATE POLICY "Users can send messages in their rooms"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.room_id = chat_messages.room_id
    AND cp.user_id = auth.uid()
    AND cp.left_at IS NULL
  )
);
