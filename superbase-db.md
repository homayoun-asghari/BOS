CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text UNIQUE,
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