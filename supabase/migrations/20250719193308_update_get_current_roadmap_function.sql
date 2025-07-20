-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.get_current_roadmap(user_id uuid);

-- Recreate the function with the is_public parameter
CREATE OR REPLACE FUNCTION public.get_current_roadmap(user_id uuid, is_public_only boolean DEFAULT false)
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
  'cover_image_url', r.cover_image_url,
  'is_public', r.is_public,
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
        'start_date', m.start_date,
        'end_date', m.end_date,
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
              'updated_at', t.updated_at,
              'description', t.description
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
  AND (NOT get_current_roadmap.is_public_only OR r.is_public = true);
