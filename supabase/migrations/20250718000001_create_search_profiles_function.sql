-- Create a function to search profiles
CREATE OR REPLACE FUNCTION public.search_profiles(
  search_term text,
  current_user_id uuid
)
RETURNS TABLE (
  id uuid,
  username text,
  email text,
  avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.username,
    p.email,
    p.avatar_url
  FROM 
    profiles p
  WHERE 
    (p.username ILIKE search_term OR p.email ILIKE search_term)
    AND p.id != current_user_id
  LIMIT 10;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_profiles(text, uuid) TO authenticated;
