-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.get_user_completed_stats(uuid);

-- Create the function with column qualification to avoid parameter shadowing
CREATE OR REPLACE FUNCTION public.get_user_completed_stats(user_id uuid)
RETURNS TABLE (
  completed_roadmaps bigint,
  completed_milestones bigint,
  completed_tasks bigint
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH user_roadmaps AS (
    SELECT id FROM public.roadmaps 
    WHERE roadmaps.user_id = get_user_completed_stats.user_id AND status = 'completed'
  )
  SELECT 
    (SELECT COUNT(*) FROM user_roadmaps) as completed_roadmaps,
    
    (SELECT COUNT(*) FROM public.milestones m
     JOIN public.roadmaps r ON m.roadmap_id = r.id
     WHERE r.user_id = get_user_completed_stats.user_id 
     AND m.status = 'completed') as completed_milestones,
    
    (SELECT COUNT(*) FROM public.tasks t
     JOIN public.milestones m ON t.milestone_id = m.id
     JOIN public.roadmaps r ON m.roadmap_id = r.id
     WHERE r.user_id = get_user_completed_stats.user_id 
     AND t.status = 'done') as completed_tasks;
$$;
