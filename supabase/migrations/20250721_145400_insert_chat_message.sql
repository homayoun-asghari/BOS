-- Drop existing function if it exists
drop function if exists insert_chat_message(uuid, text, text);

-- Create a new function with a different name
create or replace function insert_chat_message(
  p_room_id uuid,
  p_content text,
  p_media_urls text default null
) returns json as $$
declare
  result json;
  current_uid uuid := auth.uid();
  media_urls_json jsonb;
begin
  if current_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from chat_participants
    where room_id = p_room_id
      and user_id = current_uid
      and left_at is null
  ) then
    raise exception 'You are not part of this chat room.';
  end if;

  -- Parse the JSON string if media_urls is provided
  if p_media_urls is not null then
    begin
      media_urls_json := p_media_urls::jsonb;
    exception when others then
      raise exception 'Invalid JSON format for media_urls';
    end;
  end if;

  with inserted_message as (
    insert into public.chat_messages (
      room_id,
      sender_id,
      content,
      media_urls,
      is_read
    ) values (
      p_room_id,
      current_uid,
      p_content,
      media_urls_json,
      false
    )
    returning *
  )
  select to_jsonb(im) || jsonb_build_object(
    'user', jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'avatar_url', p.avatar_url
    )
  ) into result
  from inserted_message im
  left join public.profiles p on im.sender_id = p.id;

  return result;
end;
$$ language plpgsql security definer;

-- Grant execute permissions
grant execute on function insert_chat_message(uuid, text, text) to authenticated;
