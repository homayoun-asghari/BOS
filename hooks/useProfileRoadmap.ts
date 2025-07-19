import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { TaskType } from '@/components/dashboard/roadmap-visualization';

// Reusing the same type definitions from useRoadmapData
export type Task = {
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

export const useProfileRoadmap = (userId: string | undefined) => {
  console.log('🔍 [useProfileRoadmap] Hook initialized with userId:', userId);
  console.log('🔍 [useProfileRoadmap] Hook initialized with userId:', userId);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const safeSetRoadmap = useCallback((data: Partial<Roadmap> | null) => {
    if (!data || !data.user_id) {
      setRoadmap(null);
      return;
    }
    
    setRoadmap({
      ...EMPTY_ROADMAP,
      ...data,
      milestones: Array.isArray(data.milestones) && data.milestones.length > 0
        ? data.milestones
            .filter(m => m && m.id)
            .map(m => ({
              ...m,
              tasks: Array.isArray(m.tasks) 
                ? m.tasks.filter(t => t && t.id)
                : []
            }))
        : []
    });
  }, []);

  const fetchRoadmapData = useCallback(async (forceRefresh = false) => {
    if (!userId) {
      console.log('🔍 [useProfileRoadmap] No userId provided, returning empty state');
      setLoading(false);
      safeSetRoadmap(null);
      return;
    }

    // Ensure userId is a valid UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(userId)) {
      console.log('🔍 [useProfileRoadmap] Invalid UUID:', userId);
      setLoading(false);
      safeSetRoadmap(null);
      return;
    }

    try {
      console.log('🔍 [useProfileRoadmap] Fetching roadmap for userId:', userId);
      const { data, error } = await supabase.rpc('get_current_roadmap', {
        user_id: userId
      });
      
      if (error) {
        console.error('❌ [useProfileRoadmap] Error fetching roadmap:', {
          error: error.message,
          userId,
          errorDetails: error
        });
        setError(error.message);
        setLoading(false);
        return;
      }

      // Transform the RPC response to match our RoadmapType interface
      const transformedData = data ? {
        id: data.id,
        user_id: userId,
        final_goal: data.title,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        milestones: data.milestones?.map((milestone: any) => ({
          id: milestone.id,
          title: milestone.title,
          description: milestone.description,
          start_date: milestone.start_date,
          end_date: milestone.end_date,
          order_index: milestone.order_index,
          roadmap_id: data.id,
          tasks: milestone.tasks?.map((task: any) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            due_date: task.due_date,
            status: task.status as TaskType['status'],
            priority: 'medium',
            order_index: task.order_index || 0,
            milestone_id: milestone.id
          })) || []
        })) || [],
        start_date: data.start_date || new Date().toISOString(),
        end_date: data.end_date || new Date().toISOString()
      } : null;

      safeSetRoadmap(transformedData);

      if (data) {
        console.log('✅ [useProfileRoadmap] Roadmap fetched successfully:', {
          roadmapId: data.id,
          userId,
          milestones: data.milestones?.length
        });
      } else {
        console.log('ℹ️ [useProfileRoadmap] No roadmap found for user:', userId);
      }
    } catch (err) {
      console.error('Unexpected error fetching roadmap:', err);
      setError('Failed to fetch roadmap');
    } finally {
      setLoading(false);
    }
  }, [userId, safeSetRoadmap]);

  useEffect(() => {
    fetchRoadmapData();
  }, [userId, fetchRoadmapData]);

  return {
    roadmap,
    loading,
    error,
    refresh: fetchRoadmapData
  };
};
