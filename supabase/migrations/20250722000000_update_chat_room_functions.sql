-- Update create_chat_room function to include display_name in participants
DROP FUNCTION IF EXISTS public.create_chat_room(uuid[], boolean, text);

CREATE OR REPLACE FUNCTION public.create_chat_room(
  p_user_ids uuid[],
  p_is_group boolean,
  p_name text default null
)
returns json
language plpgsql
security definer
as $$
declare
  v_room_id uuid;
  v_user_id uuid;
  v_creator_id uuid;
  v_result json;
begin
  -- Validate input
  if array_length(p_user_ids, 1) is null or array_length(p_user_ids, 1) = 0 then
    raise exception 'At least one user ID is required';
  end if;
  
  -- Use the first user as the creator
  v_creator_id := p_user_ids[1];
  
  -- Create the room
  insert into chat_rooms (name, is_group, updated_at)
  values (p_name, p_is_group, now())
  returning id into v_room_id;
  
  -- Initialize v_result with basic room data
  select json_build_object(
    'id', v_room_id,
    'room_id', v_room_id,
    'name', p_name,
    'is_group', p_is_group,
    'created_at', now(),
    'updated_at', now(),
    'participants', '[]'::json
  ) into v_result;
  
  -- Add all users as participants
  foreach v_user_id in array p_user_ids
  loop
    insert into chat_participants (room_id, user_id, joined_at)
    values (v_room_id, v_user_id, now());
  end loop;
  
  -- Refresh the result with the updated participants including display_name
  select json_build_object(
    'id', cr.id,
    'room_id', cr.id,
    'name', cr.name,
    'is_group', cr.is_group,
    'created_at', cr.created_at,
    'updated_at', cr.updated_at,
    'participants', (
      select json_agg(json_build_object(
        'id', p.id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      ))
      from profiles p
      join chat_participants cp on p.id = cp.user_id
      where cp.room_id = cr.id
    )
  ) into v_result
  from chat_rooms cr
  where cr.id = v_room_id;
  
  return v_result;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.create_chat_room(uuid[], boolean, text) to authenticated;
