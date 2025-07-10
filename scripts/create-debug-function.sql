-- Create a debug function to test link insertion
CREATE OR REPLACE FUNCTION debug_insert_link(
  p_note_id UUID,
  p_link_type TEXT,
  p_target_note_id UUID DEFAULT NULL,
  p_url TEXT DEFAULT NULL,
  p_link_text TEXT DEFAULT ''
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_error TEXT;
  v_link_id UUID;
BEGIN
  -- Log the attempt
  RAISE NOTICE 'Attempting to insert link: note_id=%, type=%, target_note_id=%, url=%, text=%',
    p_note_id, p_link_type, p_target_note_id, p_url, p_link_text;

  -- Try to insert the link
  INSERT INTO note_links (
    note_id,
    link_type,
    target_note_id,
    url,
    link_text,
    created_at
  ) VALUES (
    p_note_id,
    p_link_type::link_type,
    p_target_note_id,
    p_url,
    p_link_text,
    NOW()
  )
  RETURNING id INTO v_link_id;

  -- If we get here, the insert was successful
  RETURN jsonb_build_object(
    'success', true,
    'link_id', v_link_id,
    'message', 'Link created successfully'
  );

EXCEPTION WHEN OTHERS THEN
  -- Capture any errors
  GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
  RETURN jsonb_build_object(
    'success', false,
    'error', v_error,
    'message', 'Failed to create link',
    'sqlstate', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
