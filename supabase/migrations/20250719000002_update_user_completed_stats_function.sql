-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.get_user_completed_stats(uuid);

-- Create the updated function with all 6 stats
CREATE OR REPLACE FUNCTION public.get_user_completed_stats(target_user_id uuid)
RETURNS TABLE (
  completed_roadmaps bigint,
  completed_milestones bigint,
  completed_tasks bigint,
  total_posts bigint,
  public_notes bigint,
  total_likes bigint
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH user_roadmaps AS (
    SELECT id FROM public.roadmaps 
    WHERE user_id = target_user_id AND status = 'completed'
  )
  SELECT 
    -- Completed roadmaps
    (SELECT COUNT(*) FROM user_roadmaps) as completed_roadmaps,
    
    -- Completed milestones - either status is 'completed' OR all tasks are done
    (SELECT COUNT(DISTINCT m.id)
     FROM public.milestones m
     JOIN public.roadmaps r ON m.roadmap_id = r.id
     LEFT JOIN public.tasks t ON t.milestone_id = m.id
     WHERE r.user_id = target_user_id 
     AND (
       -- Either milestone is marked as completed
       m.status = 'completed'
       -- OR all tasks are done (for milestones with tasks)
       OR EXISTS (
         SELECT 1
         FROM public.tasks t2
         WHERE t2.milestone_id = m.id
         HAVING COUNT(t2.id) > 0  -- Has at least one task
            AND COUNT(t2.id) = COUNT(CASE WHEN t2.status = 'done' THEN 1 END)
       )
       -- Include milestones with no tasks (count as completed if status is 'completed')
       OR NOT EXISTS (SELECT 1 FROM public.tasks WHERE milestone_id = m.id)
     )) as completed_milestones,
    
    -- Completed tasks
    (SELECT COUNT(*) FROM public.tasks t
     JOIN public.milestones m ON t.milestone_id = m.id
     JOIN public.roadmaps r ON m.roadmap_id = r.id
     WHERE r.user_id = target_user_id 
     AND t.status = 'done') as completed_tasks,
    
    -- Total posts
    (SELECT COUNT(*) FROM public.posts 
     WHERE user_id = target_user_id) as total_posts,
    
    -- Public notes
    (SELECT COUNT(*) FROM public.notes 
     WHERE user_id = target_user_id 
     AND is_public = true) as public_notes,
     
    -- Total likes
    (SELECT COUNT(*) FROM public.post_likes 
     WHERE user_id = target_user_id) as total_likes;
$$;
