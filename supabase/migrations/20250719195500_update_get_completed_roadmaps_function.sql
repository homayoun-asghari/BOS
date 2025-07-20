-- Update the get_completed_roadmaps function to include full milestone and task data
CREATE OR REPLACE FUNCTION public.get_completed_roadmaps(
  user_id uuid, 
  is_public_only boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  final_goal text,
  start_date date,
  end_date date,
  cover_image_url text,
  completed_at timestamptz,
  total_milestones bigint,
  completed_milestones bigint,
  total_tasks bigint,
  completed_tasks bigint,
  is_public boolean,
  milestones jsonb
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    r.id,
    r.title,
    r.description,
    r.final_goal,
    r.start_date,
    r.end_date,
    r.cover_image_url,
    r.updated_at as completed_at,
    (SELECT COUNT(*) FROM public.milestones WHERE roadmap_id = r.id) as total_milestones,
    (SELECT COUNT(*) FROM public.milestones 
     WHERE roadmap_id = r.id AND status = 'completed') as completed_milestones,
    (SELECT COUNT(*) FROM public.tasks t
     JOIN public.milestones m ON t.milestone_id = m.id
     WHERE m.roadmap_id = r.id) as total_tasks,
    (SELECT COUNT(*) FROM public.tasks t
     JOIN public.milestones m ON t.milestone_id = m.id
     WHERE m.roadmap_id = r.id AND t.status = 'done') as completed_tasks,
    r.is_public,
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'title', m.title,
          'description', m.description,
          'start_date', m.start_date,
          'end_date', m.end_date,
          'status', m.status,
          'order_index', m.order_index,
          'tasks', (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', t.id,
                'title', t.title,
                'description', t.description,
                'status', t.status,
                'due_date', t.due_date,
                'priority', t.priority,
                'order_index', t.order_index
              )
              ORDER BY t.order_index NULLS LAST
            ), '[]'::jsonb)
            FROM public.tasks t
            WHERE t.milestone_id = m.id
          )
        )
        ORDER BY m.order_index NULLS LAST
      ), '[]'::jsonb)
      FROM public.milestones m
      WHERE m.roadmap_id = r.id
    ) as milestones
  FROM public.roadmaps r
  WHERE r.user_id = get_completed_roadmaps.user_id 
    AND r.status = 'completed'
    AND (NOT get_completed_roadmaps.is_public_only OR r.is_public = true)
  ORDER BY r.updated_at DESC;
$$;

-- Update the comment
COMMENT ON FUNCTION public.get_completed_roadmaps(uuid, boolean) IS 
  'Fetch completed roadmaps with full milestone and task data for a user, with optional public-only filtering';

-- Update the grant
GRANT EXECUTE ON FUNCTION public.get_completed_roadmaps(uuid, boolean) TO authenticated;
