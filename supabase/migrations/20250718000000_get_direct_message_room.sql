-- Function to get an existing direct message room between two users
create or replace function public.get_direct_message_room(
  p_user_id1 uuid,
  p_user_id2 uuid
)
returns table (
  id uuid,
  name text,
  is_group boolean,
  created_at timestamptz,
  updated_at timestamptz,
  participants jsonb
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    r.id,
    r.name,
    r.is_group,
    r.created_at,
    r.updated_at,
    jsonb_agg(
      jsonb_build_object(
        'id', p.user_id,
        'username', pr.username,
        'avatar_url', pr.avatar_url
      )
    ) as participants
  from chat_rooms r
  join chat_participants p1 on r.id = p1.room_id and p1.user_id = p_user_id1
  join chat_participants p2 on r.id = p2.room_id and p2.user_id = p_user_id2
  join chat_participants p on r.id = p.room_id
  join profiles pr on p.user_id = pr.id
  where 
    not r.is_group 
    and r.deleted_at is null
    and p1.left_at is null 
    and p2.left_at is null
  group by 
    r.id, r.name, r.is_group, r.created_at, r.updated_at
  having 
    count(distinct p.user_id) = 2;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_direct_message_room(uuid, uuid) to authenticated;
