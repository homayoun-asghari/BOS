-- Create a function to safely delete a user and all their data
create or replace function public.delete_user()
returns void
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
begin
  -- Get the current user's ID
  current_user_id := auth.uid();
  
  -- Delete user data from various tables (add more tables as needed)
  delete from public.posts where user_id = current_user_id;
  delete from public.notes where user_id = current_user_id;
  delete from public.roadmaps where user_id = current_user_id;
  delete from public.profiles where id = current_user_id;
  
  -- Delete auth user (this will cascade to any other tables with foreign keys)
  delete from auth.users where id = current_user_id;
end;
$$;
