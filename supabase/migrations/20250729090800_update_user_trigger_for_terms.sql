-- Update the handle_new_user trigger function to include terms acceptance fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Only process for new user inserts
  IF TG_OP = 'INSERT' THEN
    -- Insert into profiles with username, display_name, and terms acceptance from raw_user_meta_data
    INSERT INTO public.profiles (
      id, 
      email, 
      username, 
      display_name, 
      terms_accepted_at, 
      terms_version
    )
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'display_name',
      (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz,
      NEW.raw_user_meta_data->>'terms_version'
    );

    -- Then create the 366 journals for the user
    PERFORM public.create_journals_for_user(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
