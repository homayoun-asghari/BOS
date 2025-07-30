
-- Add function to get unfinished roadmaps
CREATE OR REPLACE FUNCTION get_unfinished_roadmaps(user_id UUID, is_public_only BOOLEAN DEFAULT FALSE)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Query roadmaps that are not completed (in_progress) and have passed their end_date
  WITH roadmaps_with_details AS (
    SELECT
      r.id,
      r.title,
      r.description,
      r.final_goal,
      r.start_date,
      r.end_date,
      r.status,
      r.cover_image_url,
      r.is_public,
      r.user_id,
      r.created_at,
      r.updated_at,
      (
        SELECT COUNT(t.id)
        FROM milestone m
        JOIN task t ON t.milestone_id = m.id
        WHERE m.roadmap_id = r.id
      ) AS total_tasks,
      (
        SELECT COUNT(t.id)
        FROM milestone m
        JOIN task t ON t.milestone_id = m.id
        WHERE m.roadmap_id = r.id AND t.status = 'done'
      ) AS completed_tasks,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'title', m.title,
            'description', m.description,
            'start_date', m.start_date,
            'end_date', m.end_date,
            'status', m.status,
            'order_index', m.order_index,
            'tasks', (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', t.id,
                  'title', t.title,
                  'description', t.description,
                  'status', t.status,
                  'order_index', t.order_index,
                  'due_date', t.due_date,
                  'priority', t.priority,
                  'created_at', t.created_at,
                  'updated_at', t.updated_at
                )
              )
              FROM task t
              WHERE t.milestone_id = m.id
              ORDER BY t.order_index ASC
            )
          )
        )
        FROM milestone m
        WHERE m.roadmap_id = r.id
        ORDER BY m.order_index ASC
      ) AS milestones
    FROM
      roadmap r
    WHERE
      r.user_id = user_id
      AND r.status = 'unfinished'
      AND r.end_date < CURRENT_DATE
      AND (NOT is_public_only OR r.is_public = TRUE)
  )
  
  SELECT jsonb_agg(roadmaps)
  INTO result
  FROM roadmaps_with_details roadmaps;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;