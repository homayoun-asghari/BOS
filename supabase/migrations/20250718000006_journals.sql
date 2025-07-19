-- Create journals table
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

-- Set up RLS for journals
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for journals
CREATE POLICY "Users can view their own journals"
  ON public.journals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own journals"
  ON public.journals FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to generate journals for a new user
CREATE OR REPLACE FUNCTION public.create_journals_for_user(user_id uuid)
RETURNS void AS $$
DECLARE
  i INTEGER;
  journal_date DATE;
  day_of_year INTEGER;
BEGIN
  -- Create 366 journals (accounting for leap years)
  FOR i IN 1..366 LOOP
    -- Calculate a date for this journal (using the current year as base)
    -- This is just for initial creation, the actual date can be updated later
    journal_date := (DATE_TRUNC('year', CURRENT_DATE) + (i-1) * INTERVAL '1 day')::date;
    
    -- Get day of year (1-366)
    day_of_year := EXTRACT(DOY FROM journal_date);
    
    -- Insert the journal entry
    INSERT INTO public.journals (user_id, day_index, title, content)
    VALUES (
      user_id,
      day_of_year,
      'Journal Entry ' || day_of_year,
      jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
          jsonb_build_object(
            'type', 'paragraph',
            'content', jsonb_build_array(
              jsonb_build_object(
                'type', 'text',
                'text', 'Write your thoughts for day ' || day_of_year || ' here.'
              )
            )
          )
        )
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
