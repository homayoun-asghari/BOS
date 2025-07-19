-- Create tags table
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_tag_name UNIQUE (user_id, name)
);

-- Set up RLS for tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags
CREATE POLICY "Users can create tags" 
  ON public.tags FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tags" 
  ON public.tags FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" 
  ON public.tags FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" 
  ON public.tags FOR DELETE 
  USING (auth.uid() = user_id);

-- Create note_tags junction table
CREATE TABLE public.note_tags (
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

-- Set up RLS for note_tags
ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policy for note_tags
CREATE POLICY "Users can manage their note tags" 
  ON public.note_tags FOR ALL 
  USING ((SELECT user_id FROM notes WHERE id = note_id) = auth.uid());

-- Create note_links table
CREATE TABLE public.note_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  link_type link_type NOT NULL,
  target_note_id uuid REFERENCES public.notes(id) ON DELETE SET NULL,
  url text,
  link_text text,
  created_at timestamptz DEFAULT now()
);

-- Set up RLS for note_links
ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for note_links
CREATE POLICY "Users can manage links for their notes" 
  ON public.note_links FOR ALL 
  USING ((SELECT user_id FROM notes WHERE id = note_id) = auth.uid());

CREATE POLICY "Users can create links for their notes" 
  ON public.note_links FOR INSERT 
  WITH CHECK ((SELECT user_id FROM notes WHERE id = note_id) = auth.uid());
