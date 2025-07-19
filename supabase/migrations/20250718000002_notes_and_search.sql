-- Function to extract text from TipTap JSON content
CREATE OR REPLACE FUNCTION public.extract_text_from_content(content jsonb) 
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

-- Create notes table with full-text search
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  content jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_pinned boolean DEFAULT false,
  content_search tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple', 
      COALESCE(title, '') || ' ' || COALESCE(extract_text_from_content(content), '')
    )
  ) STORED
);

-- Create indexes for notes
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_updated_at ON public.notes(updated_at DESC);
CREATE INDEX idx_notes_content_search ON public.notes USING GIN (content_search);

-- Set up RLS for notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
