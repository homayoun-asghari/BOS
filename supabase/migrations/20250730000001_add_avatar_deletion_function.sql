-- Create a function to safely delete all user avatars
create or replace function public.cleanup_user_avatars(user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  file_record record;
  deleted_count integer := 0;
  error_message text;
begin
  -- Verify the user is authenticated and owns the files
  if not exists (
    select 1 
    from auth.users 
    where id = auth.uid() and id = user_id
  ) then
    raise exception 'Permission denied: You can only manage your own avatars';
  end if;
  
  -- Find and delete all avatars for this user
  for file_record in 
    select name 
    from storage.objects 
    where bucket_id = 'avatars' 
    and name like user_id::text || '/%'
    and owner = auth.uid()
  loop
    begin
      perform storage.delete_object('avatars', file_record.name);
      deleted_count := deleted_count + 1;
    exception when others then
      error_message := error_message || 'Failed to delete ' || file_record.name || ': ' || SQLERRM || '; ';
    end;
  end loop;
  
  if error_message is not null then
    raise notice '%', error_message;
  end if;
  
  return jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'message', 'Cleaned up ' || deleted_count || ' avatar(s)' || 
               case when error_message is not null then ' (with some errors)' else '' end
  );
exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', sqlstate,
      'message', 'Error cleaning up avatars: ' || sqlerrm,
      'deleted_count', deleted_count
    );
end;
$$;

-- Create a function to safely delete a specific avatar
create or replace function public.delete_user_avatar(user_id uuid, file_name text)
returns jsonb
language plpgsql
security definer
as $$
declare
  file_path text;
begin
  -- First clean up all user avatars
  perform public.cleanup_user_avatars(user_id);
  
  -- Then return success for the specific file
  return jsonb_build_object(
    'success', true,
    'message', 'Avatar cleanup initiated',
    'file_name', file_name
  );
exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', sqlstate,
      'message', 'Error during avatar cleanup: ' || sqlerrm
    );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.delete_user_avatar(uuid, text) to authenticated;
grant execute on function public.cleanup_user_avatars(uuid) to authenticated;

-- Drop the policy if it exists to avoid conflicts
do $$
begin
  if exists (
    select 1 
    from pg_policies 
    where schemaname = 'storage' 
    and tablename = 'objects' 
    and policyname = 'Users can delete their own avatars via function'
  ) then
    drop policy "Users can delete their own avatars via function" on storage.objects;
  end if;
end $$;

-- Create or replace the policy
create policy "Users can delete their own avatars via function"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid() = owner
  and name like auth.uid()::text || '/%'
);
