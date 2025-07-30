-- Add function to update roadmap status to unfinished
CREATE OR REPLACE FUNCTION update_roadmap_status_to_unfinished(roadmap_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  affected_rows INT;
BEGIN
  UPDATE roadmap
  SET status = 'unfinished',
      updated_at = NOW()
  WHERE id = roadmap_id
  AND status = 'in_progress'
  AND end_date < CURRENT_DATE;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql;