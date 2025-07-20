import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

// Simple cache implementation with proper typing
type CacheEntry<T> = { data: T; timestamp: number };
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedData = <T>(key: string): T | null => {
  const cached = cache.get(key);
  if (!cached) return null;
  const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
  return isExpired ? null : cached.data as T;
};

const setCachedData = <T>(key: string, data: T): void => {
  cache.set(key, { data, timestamp: Date.now() });
};

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
  const { user } = useAuth();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (!user?.id) {
      setLoading(false);
      safeSetRoadmap(null);
      return;
    }

    const cacheKey = `roadmap-${user.id}`;
    
    // Return cached data if available and not forcing refresh
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        safeSetRoadmap(cachedData);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch roadmap with milestones and tasks in a single query
      const { data: roadmapData, error: roadmapError } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      // If no roadmap exists for this user, initialize empty state
      if (!roadmapData || roadmapError?.code === 'PGRST116') {
        safeSetRoadmap({
          ...EMPTY_ROADMAP,
          user_id: user.id,
          id: '',
          milestones: []
        });
        setLoading(false);
        return;
      }
      
      if (roadmapError) throw roadmapError;

      // Fetch milestones with tasks
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select(`
          *,
          tasks(*)
        `)
        .eq('roadmap_id', roadmapData.id)
        .order('order_index', { ascending: true });
      
      if (milestonesError) throw milestonesError;

      // Process and cache the data
      const processedData: Roadmap = {
        ...roadmapData,
        milestones: (milestonesData || []).map(milestone => ({
          ...milestone,
          tasks: Array.isArray(milestone.tasks) ? milestone.tasks : []
        }))
      };

      setCachedData<Roadmap>(cacheKey, processedData);
      safeSetRoadmap(processedData);
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
        // Initialize empty roadmap without an ID - let the database generate it
        safeSetRoadmap({
          ...EMPTY_ROADMAP,
          user_id: user?.id || '',
          id: '', // Empty string - will be set by the database
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

  const updateTaskStatus = useCallback(async (taskId: string, status: Task['status']) => {
    if (!user?.id) return false;

    try {
      // First, get the task to check its milestone and current status
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*, milestone:milestones(*)')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;
      if (!taskData) throw new Error('Task not found');

      // Update the task status
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Check if we need to update the milestone status
      const milestoneId = taskData.milestone_id;
      const milestoneStatus = taskData.milestone?.status;
      
      // If the milestone is completed and task is being unchecked, update milestone to in_progress
      if (milestoneStatus === 'completed' && status === 'todo') {
        const { error: milestoneError } = await supabase
          .from('milestones')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', milestoneId);

        if (milestoneError) {
          console.error('Error updating milestone status:', milestoneError);
          // Continue even if milestone update fails
        }
      }

      // Invalidate cache
      const cacheKey = `roadmap-${user.id}`;
      cache.delete(cacheKey);
      
      // Refresh data
      await fetchRoadmapData(true);
      return true;
    } catch (error) {
      console.error('Error updating task status:', error);
      return false;
    }
  }, [user?.id, fetchRoadmapData]);

  // Effect to handle data fetching
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setRoadmap(null);
      return;
    }
    
    // Only fetch if we don't have data or if the user ID changed
    if (!roadmap || roadmap.user_id !== user.id) {
      fetchRoadmapData();
    }
    // We intentionally omit 'roadmap' from deps to prevent infinite loops
    // The fetchRoadmapData callback is stable and handles the actual data fetching
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, roadmap?.user_id, fetchRoadmapData]);

  // Return the API methods and state
  return {
    roadmap,
    loading,
    error,
    refresh: fetchRoadmapData,
    deleteRoadmap,
    updateTaskStatus,
  };
}
