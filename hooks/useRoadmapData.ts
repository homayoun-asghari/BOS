import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Type definitions with strict null checks
type Task = {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  order_index: number;
  milestone_id: string;
  created_at: string;
  updated_at: string;
};

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  order_index: number;
  roadmap_id: string;
  tasks: Task[];
  created_at: string;
  updated_at: string;
};

type Roadmap = {
  id: string;
  user_id: string;
  final_goal: string;
  created_at: string;
  updated_at: string;
  milestones: Milestone[];
};

// Default empty values for initialization
const EMPTY_ROADMAP: Roadmap = {
  id: '',
  user_id: '',
  final_goal: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  milestones: []
};

export const useRoadmapData = () => {
  const { user } = useUser();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadRef = useRef(false);

  const safeSetRoadmap = useCallback((data: Partial<Roadmap> | null) => {
    if (!data || !data.user_id) {
      // If no data or no user_id, set to null to indicate no roadmap exists
      setRoadmap(null);
      return;
    }
    
    // Only set roadmap if we have valid data
    setRoadmap({
      ...EMPTY_ROADMAP,
      ...data,
      milestones: Array.isArray(data.milestones) && data.milestones.length > 0
        ? data.milestones
            .filter(m => m && m.id) // Filter out any invalid milestones
            .map(m => ({
              ...m,
              tasks: Array.isArray(m.tasks) 
                ? m.tasks.filter(t => t && t.id) // Filter out invalid tasks
                : []
            }))
        : []
    });
  }, []);

  const fetchRoadmapData = useCallback(async (forceRefresh = false) => {
    // If we already have data and this isn't a force refresh, don't fetch again
    const currentRoadmap = roadmap; // Capture current value in closure
    if (initialLoadRef.current && !forceRefresh && currentRoadmap) {
      return;
    }

    if (!user?.id) {
      setLoading(false);
      safeSetRoadmap(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First check if the user has any roadmap
      const { data: roadmapData, error: roadmapError } = await supabase
        .from('roadmaps')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roadmapError) throw roadmapError;
      
      // If no roadmap exists, set to null and return early
      if (!roadmapData) {
        safeSetRoadmap(null);
        setLoading(false);
        return;
      }
      
      // If we get here, fetch the full roadmap data
      const { data: fullRoadmap, error: fullRoadmapError } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('id', roadmapData.id)
        .single();
        
      if (fullRoadmapError) throw fullRoadmapError;
      
      // If no full roadmap data, set to null and return
      if (!fullRoadmap) {
        safeSetRoadmap(null);
        setLoading(false);
        return;
      }

      // Fetch milestones for the roadmap
      const { data: milestones = [], error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('roadmap_id', fullRoadmap.id)
        .order('order_index', { ascending: true });

      if (milestonesError) throw milestonesError;

      // If no milestones exist, set an empty array and return
      if (!milestones || milestones.length === 0) {
        safeSetRoadmap({
          ...roadmapData,
          milestones: [],
        });
        return;
      }

      // Fetch tasks for each milestone
      const milestonesWithTasks = await Promise.all(
        milestones.map(async (milestone) => {
          if (!milestone?.id) return null;
          
          try {
            const { data: tasks = [], error: tasksError } = await supabase
              .from('tasks')
              .select('*')
              .eq('milestone_id', milestone.id)
              .order('order_index', { ascending: true });

            if (tasksError) throw tasksError;

            return {
              ...milestone,
              tasks: Array.isArray(tasks) ? tasks : [],
            };
          } catch (taskError) {
            console.error(`Error fetching tasks for milestone ${milestone.id}:`, taskError);
            return {
              ...milestone,
              tasks: [],
            };
          }
        })
      );

      // Filter out any null milestones and ensure all fields exist
      const validMilestones = milestonesWithTasks
        .filter((milestone): milestone is Milestone => milestone !== null)
        .map(milestone => ({
          ...milestone,
          tasks: Array.isArray(milestone.tasks) ? milestone.tasks : []
        }));

      safeSetRoadmap({
        ...fullRoadmap,
        milestones: validMilestones,
      });
    } catch (error: unknown) {
      // Type-safe error handling
      const errorObj = error as Error & { code?: string };
      
      // Safely extract error details for logging
      const errorDetails = {
        name: errorObj?.name || 'UnknownError',
        message: errorObj?.message || 'No error message',
        code: errorObj?.code || 'no-code',
        stack: process.env.NODE_ENV === 'development' ? errorObj?.stack : undefined
      };
      
      // Handle specific Supabase error codes
      if (errorDetails.code === 'PGRST116') {
        // No roadmap found for this user - this is an expected case
        console.log('No roadmap found for user - initializing empty state');
        safeSetRoadmap({
          ...EMPTY_ROADMAP,
          user_id: user?.id || '',
          id: 'new',
          milestones: []
        });
        return;
      }
      
      // Log other errors in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error in fetchRoadmapData:', JSON.stringify(errorDetails, null, 2));
      }
      
      // Default error state for other errors
      let errorMessage = 'Failed to load roadmap data';
      let showToast = true;
      
      // Process error message
      if (errorObj?.message) {
        errorMessage = errorObj.message;
      }
      
      // Handle specific Supabase error codes
      if (errorObj?.code) {
        switch (errorObj.code) {
          case 'PGRST116':
            errorMessage = 'No roadmap found for this user';
            showToast = false;
            break;
          case 'PGRST301':
            errorMessage = 'Authentication error. Please log in again.';
            break;
          case 'PGRST302':
            errorMessage = 'Permission denied. You do not have access to this roadmap.';
            break;
          default:
            console.warn('Unhandled error code:', errorObj.code);
        }
      }
      
      setError(errorMessage);
      
      // Only show toast for non-recoverable errors
      if (showToast) {
        toast.error(errorMessage);
      }
      
      // Set empty roadmap instead of null to prevent UI from showing loading state
      safeSetRoadmap({
        ...EMPTY_ROADMAP,
        user_id: user?.id || '',
        id: 'error-state',
        milestones: []
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, safeSetRoadmap]);

  const deleteRoadmap = useCallback(async (roadmapId?: string) => {
    if (!roadmapId) {
      console.error('No roadmap ID provided for deletion');
      toast.error('No roadmap selected for deletion');
      return false;
    }

    try {
      const { error } = await supabase
        .from('roadmaps')
        .delete()
        .eq('id', roadmapId);

      if (error) throw error;
      
      safeSetRoadmap(null);
      toast.success('Roadmap deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting roadmap:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete roadmap';
      toast.error(errorMessage);
      return false;
    }
  }, [safeSetRoadmap]);

  const updateTaskStatus = useCallback(async (taskId?: string, status?: Task['status']) => {
    const currentRoadmap = roadmap; // Capture current roadmap value
    if (!currentRoadmap || !taskId || status === undefined) {
      console.error('Missing required parameters for updateTaskStatus');
      return false;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setRoadmap((prev: Roadmap | null) => {
        if (!prev) return null;
        
        const updatedMilestones = (prev.milestones || []).map(milestone => ({
          ...milestone,
          tasks: (milestone.tasks || []).map(task => 
            task.id === taskId ? { ...task, status } : task
          )
        }));

        return {
          ...prev,
          milestones: updatedMilestones
        };
      });

      return true;
    } catch (error: unknown) {
      // Safely extract error details without passing the error object directly
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      };
      
      // Log error details safely
      console.error('Error updating task status:', JSON.stringify(errorDetails, null, 2));
      
      // Show user-friendly error message
      toast.error('Failed to update task status. Please try again.');
      return false;
    }
  }, [roadmap]); // Keep the dependency to ensure we have the latest roadmap

  // Stable reference for the effect
  const stableFetchRoadmapData = useCallback(() => {
    fetchRoadmapData().then(() => {
      initialLoadRef.current = true;
    });
  }, [fetchRoadmapData]);

  useEffect(() => {
    // Only fetch if we haven't loaded yet or if the user changes
    if (!initialLoadRef.current || (user?.id && (!roadmap || roadmap.user_id !== user.id))) {
      stableFetchRoadmapData();
    }
    
    // Cleanup function to reset the ref if the component unmounts
    return () => {
      // Keep the ref true to prevent re-fetching on tab switches
      initialLoadRef.current = true;
    };
  }, [user?.id, stableFetchRoadmapData, roadmap?.user_id]); // Include all dependencies

  // Create a stable refresh function that forces a re-fetch
  const refresh = useCallback(async () => {
    initialLoadRef.current = false;
    return fetchRoadmapData(true);
  }, [fetchRoadmapData]);
  
  // Memoize the return value to prevent unnecessary re-renders
  const result = useMemo(() => ({
    roadmap,
    loading,
    error,
    refresh,
    deleteRoadmap,
    updateTaskStatus,
  }), [roadmap, loading, error, refresh, deleteRoadmap, updateTaskStatus]);
  
  return result;


};
