import { useState, useCallback, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type Task = {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  order_index: number;
  milestone_id: string;
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
};

type Roadmap = {
  id: string;
  user_id: string;
  final_goal: string;
  created_at: string;
  updated_at: string;
  milestones: Milestone[];
};

export const useRoadmapData = () => {
  const { user } = useUser();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoadmapData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch roadmap
      const { data: roadmapData, error: roadmapError } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (roadmapError) throw roadmapError;
      if (!roadmapData) {
        setRoadmap(null);
        return;
      }

      // Fetch milestones for the roadmap
      const { data: milestones, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('roadmap_id', roadmapData.id)
        .order('order_index', { ascending: true });

      if (milestonesError) throw milestonesError;

      // Fetch tasks for each milestone
      const milestonesWithTasks = await Promise.all(
        milestones.map(async (milestone) => {
          const { data: tasks, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .eq('milestone_id', milestone.id)
            .order('order_index', { ascending: true });

          if (tasksError) throw tasksError;

          return {
            ...milestone,
            tasks: tasks || [],
          };
        })
      );

      setRoadmap({
        ...roadmapData,
        milestones: milestonesWithTasks,
      });
    } catch (error) {
      console.error('Error fetching roadmap data:', error);
      setError('Failed to load roadmap data');
      toast.error('Failed to load roadmap data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deleteRoadmap = async (roadmapId: string) => {
    try {
      const { error } = await supabase
        .from('roadmaps')
        .delete()
        .eq('id', roadmapId);

      if (error) throw error;
      
      setRoadmap(null);
      toast.success('Roadmap deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting roadmap:', error);
      toast.error('Failed to delete roadmap');
      return false;
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    if (!roadmap) return false;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setRoadmap(prev => {
        if (!prev) return null;
        
        const updatedMilestones = prev.milestones.map(milestone => ({
          ...milestone,
          tasks: milestone.tasks.map(task => 
            task.id === taskId ? { ...task, status } : task
          )
        }));

        return {
          ...prev,
          milestones: updatedMilestones
        };
      });

      return true;
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
      return false;
    }
  };

  useEffect(() => {
    fetchRoadmapData();
  }, [fetchRoadmapData]);

  return {
    roadmap,
    loading,
    error,
    refresh: fetchRoadmapData,
    deleteRoadmap,
    updateTaskStatus,
  };
};
