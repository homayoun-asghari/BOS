-- Function to get user's completed stats (roadmaps, milestones, tasks)
CREATE OR REPLACE FUNCTION public.get_user_completed_stats(user_id uuid)
RETURNS TABLE (
  completed_roadmaps bigint,
  completed_milestones bigint,
  completed_tasks bigint
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    (SELECT COUNT(*) FROM public.roadmaps 
     WHERE user_id = user_id AND status = 'completed') as completed_roadmaps,
    
    (SELECT COUNT(*) FROM public.milestones m
     JOIN public.roadmaps r ON m.roadmap_id = r.id
     WHERE r.user_id = user_id AND m.status = 'completed') as completed_milestones,
    
    (SELECT COUNT(*) FROM public.tasks t
     JOIN public.milestones m ON t.milestone_id = m.id
     JOIN public.roadmaps r ON m.roadmap_id = r.id
     WHERE r.user_id = user_id AND t.status = 'done') as completed_tasks;
$$;

-- Function to get user's current active roadmap
CREATE OR REPLACE FUNCTION public.get_current_roadmap(user_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT jsonb_build_object(
  'id', r.id,
  'title', r.title,
  'description', r.description,
  'final_goal', r.final_goal,
  'start_date', r.start_date,
  'end_date', r.end_date,
  'progress', (
    SELECT 
      ROUND(
        100.0 * COUNT(t_done.*) / NULLIF(COUNT(t_all.*), 0),
        2
      )
    FROM public.milestones m
    LEFT JOIN public.tasks t_all ON t_all.milestone_id = m.id
    LEFT JOIN public.tasks t_done ON t_done.milestone_id = m.id AND t_done.status = 'done'
    WHERE m.roadmap_id = r.id
  ),
  'milestones', (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'title', m.title,
        'description', m.description,
        'due_date', m.end_date,
        'progress', (
          SELECT ROUND(
            100.0 * COUNT(t_done.*) / NULLIF(COUNT(t_all.*), 0),
            2
          )
          FROM public.tasks t_all
          LEFT JOIN public.tasks t_done ON t_done.id = t_all.id AND t_done.status = 'done'
          WHERE t_all.milestone_id = m.id
        ),
        'tasks', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', t.id,
              'title', t.title,
              'completed', t.status = 'done',
              'due_date', t.due_date,
              'priority', t.priority,
              'status', t.status,
              'order_index', t.order_index,
              'created_at', t.created_at,
              'updated_at', t.updated_at
            )
            ORDER BY t.order_index NULLS LAST, t.created_at
          )
          FROM public.tasks t
          WHERE t.milestone_id = m.id
        )
      )
      ORDER BY m.order_index NULLS LAST, m.created_at
    )
    FROM public.milestones m
    WHERE m.roadmap_id = r.id
  )
)
FROM public.roadmaps r
WHERE r.user_id = get_current_roadmap.user_id
  AND r.status = 'in_progress'
ORDER BY r.updated_at DESC
LIMIT 1;
$$;


-- Function to get user's completed roadmaps history
CREATE OR REPLACE FUNCTION public.get_completed_roadmaps(user_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  completed_at timestamptz,
  total_milestones bigint,
  completed_milestones bigint,
  total_tasks bigint,
  completed_tasks bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    r.id,
    r.title,
    r.description,
    r.updated_at as completed_at,
    (SELECT COUNT(*) FROM public.milestones WHERE roadmap_id = r.id) as total_milestones,
    (SELECT COUNT(*) FROM public.milestones 
     WHERE roadmap_id = r.id AND status = 'completed') as completed_milestones,
    (SELECT COUNT(*) FROM public.tasks t
     JOIN public.milestones m ON t.milestone_id = m.id
     WHERE m.roadmap_id = r.id) as total_tasks,
    (SELECT COUNT(*) FROM public.tasks t
     JOIN public.milestones m ON t.milestone_id = m.id
     WHERE m.roadmap_id = r.id AND t.status = 'done') as completed_tasks
  FROM public.roadmaps r
  WHERE r.user_id = user_id 
    AND r.status = 'completed'
  ORDER BY r.updated_at DESC;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_completed_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_roadmap(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_completed_roadmaps(uuid) TO authenticated;