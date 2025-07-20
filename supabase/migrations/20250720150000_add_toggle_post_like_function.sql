-- Create a function to handle like toggling in a single database call
CREATE OR REPLACE FUNCTION public.toggle_post_like(
  p_post_id UUID,
  p_user_id UUID
) 
RETURNS TABLE (
  action TEXT,
  like_count BIGINT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_like_exists BOOLEAN;
  v_like_count BIGINT;
BEGIN
  -- Check if the like already exists
  SELECT EXISTS (
    SELECT 1 
    FROM public.post_likes 
    WHERE post_id = p_post_id AND user_id = p_user_id
  ) INTO v_like_exists;
  
  IF v_like_exists THEN
    -- Unlike the post
    DELETE FROM public.post_likes 
    WHERE post_id = p_post_id AND user_id = p_user_id;
    
    -- Get the updated like count
    SELECT COUNT(*) INTO v_like_count
    FROM public.post_likes 
    WHERE post_id = p_post_id;
    
    -- Return the result
    RETURN QUERY SELECT 'unliked'::TEXT, v_like_count;
  ELSE
    -- Like the post
    INSERT INTO public.post_likes (post_id, user_id)
    VALUES (p_post_id, p_user_id);
    
    -- Get the updated like count
    SELECT COUNT(*) INTO v_like_count
    FROM public.post_likes 
    WHERE post_id = p_post_id;
    
    -- Return the result
    RETURN QUERY SELECT 'liked'::TEXT, v_like_count;
  END IF;
  
  -- Handle any errors
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error toggling like: %', SQLERRM;
END;
$$;
