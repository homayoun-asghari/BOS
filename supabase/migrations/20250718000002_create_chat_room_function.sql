-- Function to create a new chat room
create or replace function public.create_chat_room(
  p_user_ids uuid[],
  p_is_group boolean,
  p_name text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_room_id uuid;
  v_user_id uuid;
  v_creator_id uuid;
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
  
  -- Add all users as participants
  foreach v_user_id in array p_user_ids
  loop
    insert into chat_participants (room_id, user_id, joined_at)
    values (v_room_id, v_user_id, now());
  end loop;
  
  return v_room_id;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.create_chat_room(uuid[], boolean, text) to authenticated;
