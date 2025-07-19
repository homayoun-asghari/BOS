-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Set up RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Create function to handle new user creation
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

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
