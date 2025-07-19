-- Create personal_codes table
CREATE TABLE public.personal_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add full-text search column
ALTER TABLE public.personal_codes 
  ADD COLUMN content_search tsvector 
  GENERATED ALWAYS AS (to_tsvector('english', content)) 
  STORED;

-- Create index for full-text search
CREATE INDEX idx_personal_codes_search 
  ON public.personal_codes 
  USING GIN (content_search);

-- Set up RLS for personal_codes
ALTER TABLE public.personal_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for personal_codes
CREATE POLICY "Users can create personal codes" 
  ON public.personal_codes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own personal codes" 
  ON public.personal_codes FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own personal codes" 
  ON public.personal_codes FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own personal codes" 
  ON public.personal_codes FOR DELETE 
  USING (auth.uid() = user_id);
