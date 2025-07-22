CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Only process for new user inserts
  IF TG_OP = 'INSERT' THEN
    -- Insert into profiles with username and display_name from raw_user_meta_data
    INSERT INTO public.profiles (id, email, username, display_name)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'display_name'
    );

    -- Then create the 366 journals for the user
    PERFORM public.create_journals_for_user(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;






DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();






CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- RLS Policy: Users can only view/update their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);







-- 1. Create the recursive function to extract all "text" from TipTap JSON content
CREATE OR REPLACE FUNCTION extract_text_from_content(content jsonb) 
RETURNS text AS $$
DECLARE
  result text := '';
  node jsonb;
BEGIN
  -- Handle null or empty content
  IF content IS NULL OR content = 'null'::jsonb THEN
    RETURN '';
  END IF;
  
  -- If content is a text node
  IF jsonb_typeof(content) = 'string' THEN
    RETURN content #>> '{}';
  END IF;
  
  -- If content has a text property
  IF content ? 'text' THEN
    result := result || ' ' || (content->>'text');
  END IF;
  
  -- Recursively process content array
  IF content ? 'content' AND jsonb_typeof(content->'content') = 'array' THEN
    FOR node IN SELECT * FROM jsonb_array_elements(content->'content')
    LOOP
      result := result || ' ' || extract_text_from_content(node);
    END LOOP;
  END IF;
  
  RETURN trim(result);
END;
$$ LANGUAGE plpgsql IMMUTABLE;







-- 2. Create the notes table with the generated tsvector column using the function
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  content jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_pinned boolean DEFAULT false,

  -- Full-text search index (generated column)
  content_search tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple', 
      COALESCE(title, '') || ' ' || COALESCE(extract_text_from_content(content), '')
    )
  ) STORED
);

CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_updated_at ON public.notes(updated_at DESC);
CREATE INDEX idx_notes_content_search ON public.notes USING GIN (content_search);
CREATE INDEX idx_notes_pinned ON public.notes(pinned);

-- 3. Row-Level Security (RLS)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);








CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Tags are scoped per user
  name text UNIQUE NOT NULL, -- Tag names must be unique per user
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_tag_name UNIQUE (user_id, name) -- Ensure unique tag name per user
);

-- RLS Policy: Users can only manage their own tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);







CREATE TABLE public.note_tags (
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

-- RLS Policy: Ensure users can only link their own notes and tags
ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their note tags" ON public.note_tags
  FOR ALL USING ((SELECT user_id FROM notes WHERE id = note_id) = auth.uid());








CREATE TYPE link_type AS ENUM ('internal', 'external');

CREATE TABLE public.note_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  link_type link_type NOT NULL, -- 'internal' or 'external'
  target_note_id uuid REFERENCES public.notes(id) ON DELETE SET NULL, -- For internal links
  url text, -- For external links
  link_text text, -- The text that displays the link (e.g., [[My Linked Note]] or [Google](https://google.com))
  created_at timestamptz DEFAULT now()
);

-- RLS Policy: Users can only manage links for their own notes
ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;

-- For SELECT, UPDATE, DELETE
CREATE POLICY "Users can manage links for their notes" ON public.note_links
  FOR ALL USING ((SELECT user_id FROM notes WHERE id = note_id) = auth.uid());

-- Explicit policy for INSERT with WITH CHECK
CREATE POLICY "Users can create links for their notes" ON public.note_links
  FOR INSERT WITH CHECK ((SELECT user_id FROM notes WHERE id = note_id) = auth.uid());













CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Redundant but useful for RLS
  file_name text NOT NULL,
  file_type text,
  file_size_bytes bigint,
  storage_path text UNIQUE NOT NULL, -- Path in Supabase Storage bucket
  uploaded_at timestamptz DEFAULT now()
);

-- RLS Policy: Users can only manage attachments for their own notes/files
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create attachments for their notes" ON public.attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view attachments for their notes" ON public.attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete attachments for their notes" ON public.attachments FOR DELETE USING (auth.uid() = user_id);


-- In Supabase Storage, for 'notes-attachments' bucket:
-- Policy 1: Allow authenticated users to upload files in their own folder
CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'notes-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy 2: Allow authenticated users to view their own files
CREATE POLICY "Allow authenticated view"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'notes-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy 3: Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'notes-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);







CREATE TABLE public.roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  final_goal text, -- The main objective
  start_date date,
  end_date date,
  status text DEFAULT 'draft', -- e.g., 'draft', 'in_progress', 'completed', 'archived'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policies (similar to notes)
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own roadmaps" ON public.roadmaps FOR ALL USING (auth.uid() = user_id);







CREATE TABLE public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_date date,
  end_date date,
  status text DEFAULT 'pending', -- e.g., 'pending', 'in_progress', 'completed'
  order_index int, -- For displaying milestones in a specific order
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policies: Inherit from roadmap
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage milestones for their roadmaps" ON public.milestones
  FOR ALL USING ((SELECT user_id FROM roadmaps WHERE id = roadmap_id) = auth.uid());








CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status text DEFAULT 'todo', -- e.g., 'todo', 'in_progress', 'done', 'blocked'
  priority text DEFAULT 'medium', -- e.g., 'low', 'medium', 'high', 'urgent'
  order_index int, -- For displaying tasks in a specific order
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policies: Inherit from milestone -> roadmap
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage tasks for their milestones" ON public.tasks
  FOR ALL USING (
    (SELECT user_id FROM milestones m JOIN roadmaps r ON m.roadmap_id = r.id WHERE m.id = milestone_id) = auth.uid()
  );















CREATE TABLE public.personal_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL, -- The actual text of the personal code/rule/quote
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policies (ensuring users can only manage their own personal codes)
ALTER TABLE public.personal_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create personal codes" ON public.personal_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own personal codes" ON public.personal_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own personal codes" ON public.personal_codes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own personal codes" ON public.personal_codes FOR DELETE USING (auth.uid() = user_id);

-- Full-Text Search for personal code content
-- This will now search only within the 'content' column.
ALTER TABLE public.personal_codes ADD COLUMN content_search tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
CREATE INDEX idx_personal_codes_search ON public.personal_codes USING GIN (content_search);










CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE public.journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_index smallint NOT NULL CHECK (day_index >= 1 AND day_index <= 366),
  title text NOT NULL,
  content jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_day UNIQUE(user_id, day_index)
);




ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own journals"
  ON public.journals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own journals"
  ON public.journals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);



  CREATE OR REPLACE FUNCTION public.create_journals_for_user(p_user_id uuid)
RETURNS void AS $$
DECLARE
  i int;
  d date := '2000-01-01'::date; -- Leap year base
  day_date date;
  day_title text;
BEGIN
  -- Delete any existing entries for this user
  DELETE FROM public.journals WHERE user_id = p_user_id;
  
  -- Create 366 entries (including Feb 29)
  FOR i IN 1..366 LOOP
    day_date := d + (i - 1) * INTERVAL '1 day';
    day_title := TO_CHAR(day_date, 'FMDD FMMonth');
    
    INSERT INTO public.journals (user_id, day_index, title, created_at, updated_at)
    VALUES (
      p_user_id,
      i,
      day_title,
      now(),
      now()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;





CREATE OR REPLACE FUNCTION public.get_journal_by_date(p_user_id uuid, p_date date)
RETURNS SETOF public.journals AS $$
DECLARE
  day_of_year int;
  is_leap_year boolean;
  year_part int;
BEGIN
  -- Get the year part of the provided date
  year_part := EXTRACT(YEAR FROM p_date)::int;
  
  -- Check if the year is a leap year
  is_leap_year := (year_part % 4 = 0 AND (year_part % 100 != 0 OR year_part % 400 = 0));
  
  -- Get day of year (1-366)
  day_of_year := EXTRACT(DOY FROM p_date)::int;
  
  -- Adjust for non-leap years
  IF NOT is_leap_year AND day_of_year > 59 THEN
    day_of_year := day_of_year + 1;
  END IF;
  
  RETURN QUERY
  SELECT * FROM public.journals
  WHERE user_id = p_user_id 
  AND day_index = day_of_year;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


















-- Posts table
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  media_urls jsonb DEFAULT '[]'::jsonb, -- Array of media URLs
  like_count integer DEFAULT 0,
  is_edited boolean DEFAULT false,
  roadmap_id uuid REFERENCES public.roadmaps(id) ON DELETE SET NULL,
  milestone_id uuid REFERENCES public.milestones(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Likes table
CREATE TABLE public.post_likes (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

-- Mentions
CREATE TABLE public.post_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  mentioned_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentioned_note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);













-- Chat rooms
CREATE TABLE public.chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean DEFAULT false,
  name text,
  media_urls jsonb DEFAULT '[]'::jsonb, -- For group avatars/media
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Chat participants
CREATE TABLE public.chat_participants (
  room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  PRIMARY KEY (room_id, user_id)
);

-- Chat messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  media_urls jsonb DEFAULT '[]'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);






-- Posts
CREATE INDEX idx_posts_user_id ON public.posts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_post_mentions ON public.post_mentions(post_id) WHERE deleted_at IS NULL;

-- Messages
CREATE INDEX idx_messages_room ON public.chat_messages(room_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_unread_messages ON public.chat_messages(room_id, is_read) WHERE is_read = false AND deleted_at IS NULL;
CREATE INDEX idx_chat_participants_user ON public.chat_participants(user_id) WHERE left_at IS NULL;









-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Users can view non-deleted posts" 
ON public.posts FOR SELECT 
USING (deleted_at IS NULL);

CREATE POLICY "Users can manage own posts" 
ON public.posts 
FOR ALL USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Chat room policies
CREATE POLICY "Users can view joined rooms" 
ON public.chat_rooms FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.chat_participants 
  WHERE chat_participants.room_id = chat_rooms.id 
  AND chat_participants.user_id = auth.uid()
  AND chat_participants.left_at IS NULL
));

-- Message policies
CREATE POLICY "Users can view room messages" 
ON public.chat_messages FOR SELECT 
USING (
  deleted_at IS NULL AND
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_participants.room_id = chat_messages.room_id 
    AND chat_participants.user_id = auth.uid()
    AND chat_participants.left_at IS NULL
  )
);

CREATE POLICY "Users can send messages to joined rooms"
ON public.chat_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_participants.room_id = chat_messages.room_id
    AND chat_participants.user_id = auth.uid()
    AND chat_participants.left_at IS NULL
  )
);











-- Update updated_at on posts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW; 
END;
$$ language 'plpgsql';

CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update like count
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts 
    SET like_count = like_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts 
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_like_count
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_like_count();









-- Enable realtime for posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Add realtime for specific events
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'new_message', 
    json_build_object(
      'room_id', NEW.room_id,
      'message_id', NEW.id
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION notify_new_message();




-- Function to get an existing direct message room between two users
create or replace function public.get_direct_message_room(
  p_user_id1 uuid,
  p_user_id2 uuid
)
returns table (
  id uuid,
  name text,
  is_group boolean,
  created_at timestamptz,
  updated_at timestamptz,
  participants jsonb
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    r.id,
    r.name,
    r.is_group,
    r.created_at,
    r.updated_at,
    jsonb_agg(
      jsonb_build_object(
        'id', p.user_id,
        'username', pr.username,
        'avatar_url', pr.avatar_url
      )
    ) as participants
  from chat_rooms r
  join chat_participants p1 on r.id = p1.room_id and p1.user_id = p_user_id1
  join chat_participants p2 on r.id = p2.room_id and p2.user_id = p_user_id2
  join chat_participants p on r.id = p.room_id
  join profiles pr on p.user_id = pr.id
  where 
    not r.is_group 
    and r.deleted_at is null
    and p1.left_at is null 
    and p2.left_at is null
  group by 
    r.id, r.name, r.is_group, r.created_at, r.updated_at
  having 
    count(distinct p.user_id) = 2;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_direct_message_room(uuid, uuid) to authenticated;
