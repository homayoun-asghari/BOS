'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { RoadmapVisualization } from '@/components/dashboard/roadmap-visualization';

interface HistoryRoadmap {
  id: string;
  title: string;
  description: string | null;
  final_goal: string;
  start_date?: string | null;
  end_date?: string | null;
  status?: 'draft' | 'in_progress' | 'completed' | 'archived';
  cover_image_url?: string | null;
  is_public?: boolean;
  completed_at?: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  milestones?: Array<{
    id: string;
    title: string;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked';
    order_index: number;
    tasks: Array<{
      id: string;
      title: string;
      description?: string | null;
      status: 'todo' | 'in_progress' | 'done';
      milestone_id: string;
      order_index: number;
      due_date: string | null;
      priority: 'low' | 'medium' | 'high';
      created_at: string;
      updated_at: string;
    }>;
    isCompleted?: boolean;
  }>;
}

interface HistorySectionProps {
  userId?: string; // Optional userId prop to fetch roadmaps for a specific user
}

export function HistorySection({ userId: propUserId }: HistorySectionProps = {}) {
  type RoadmapFromDB = {
    id: string;
    title?: string;
    description?: string | null;
    final_goal?: string;
    start_date?: string | null;
    end_date?: string | null;
    cover_image_url?: string | null;
    is_public?: boolean;
    completed_at?: string;
    total_tasks?: number;
    completed_tasks?: number;
    milestones?: Array<{
      id: string;
      title: string;
      description: string | null;
      start_date: string | null;
      end_date: string | null;
      status: 'pending' | 'in_progress' | 'completed' | 'blocked';
      order_index: number;
      tasks?: Array<{
        id: string;
        title: string;
        description?: string | null;
        status: 'todo' | 'in_progress' | 'done';
        milestone_id: string;
        order_index: number;
        due_date: string | null;
        priority: 'low' | 'medium' | 'high';
        created_at?: string;
        updated_at?: string;
      }>;
    }>;
  };

  const [roadmaps, setRoadmaps] = useState<HistoryRoadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const { user } = useAuth();

  // Define callbacks at the top level
  const handleTaskStatusChange = useCallback(async () => {
    // No-op for completed roadmaps
    return false;
  }, []);

  const noop = useCallback(() => {}, []);
  const asyncNoop = useCallback(async () => true, []);

  useEffect(() => {
    if (!user && !propUserId) return;
    if (hasFetched) return;

    (async () => {
      setLoading(true);
      try {
        const targetUserId = propUserId || user?.id;
        if (!targetUserId) return;

        // Fetch completed roadmaps
        const { data: completedData, error: completedError } = await supabase
          .rpc('get_completed_roadmaps', {
            user_id: targetUserId,
            is_public_only: false
          });

        if (completedError) throw completedError;

        // Fetch unfinished roadmaps
        const { data: unfinishedData, error: unfinishedError } = await supabase
          .rpc('get_unfinished_roadmaps', {
            user_id: targetUserId,
            is_public_only: false
          });

        if (unfinishedError) throw unfinishedError;

        console.log('Raw roadmaps data:', { completedData, unfinishedData });

        // Transform and combine the data
        const formatRoadmap = (roadmap: RoadmapFromDB, isCompleted: boolean) => {
          const totalTasks = roadmap.total_tasks || 0;
          const completedTasks = roadmap.completed_tasks || 0;
          
          return {
            id: roadmap.id,
            title: roadmap.title || 'Untitled Roadmap',
            description: roadmap.description || null,
            final_goal: roadmap.final_goal || 'No goal specified',
            start_date: roadmap.start_date || null,
            end_date: roadmap.end_date || null,
            status: isCompleted ? 'completed' : 'in_progress',
            cover_image_url: roadmap.cover_image_url || null,
            is_public: roadmap.is_public || false,
            completed_at: isCompleted ? roadmap.completed_at : undefined,
            progress: totalTasks > 0 
              ? Math.round((completedTasks / totalTasks) * 100) 
              : 0,
            totalTasks,
            completedTasks,
            milestones: (roadmap.milestones || []).map((m) => ({
              ...m,
              tasks: (m.tasks || []).map((t) => ({
                ...t,
                milestone_id: m.id,
                created_at: t.created_at || new Date().toISOString(),
                updated_at: t.updated_at || new Date().toISOString()
              }))
            }))
          };
        };

        const formattedData = [
          ...(completedData as RoadmapFromDB[]).map(r => formatRoadmap(r, true)),
          ...(unfinishedData as RoadmapFromDB[]).map(r => formatRoadmap(r, false))
        ] as HistoryRoadmap[];
        
        // Sort roadmaps by start_date in descending order (latest on top)
        formattedData.sort((a, b) => {
          // Default to current date if start_date is null or undefined
          const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
          const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
          return dateB - dateA; // Descending order
        });
        
        console.log('Formatted and sorted roadmaps:', formattedData);
        setRoadmaps(formattedData);
        setHasFetched(true);
      } catch (error) {
        console.error('Error fetching roadmaps:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, hasFetched, propUserId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (roadmaps.length === 0) {
    console.log('No roadmaps to display. State:', {
      loading,
      hasFetched,
      user: user?.id,
      propUserId,
      roadmapsCount: roadmaps.length
    });
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No roadmaps yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background z-50 p-4 border-b">
        <h3 className="text-sm font-medium text-muted-foreground">History</h3>
      </div>
      <div className="flex-1">
        <div className="space-y-4 p-4">
          {roadmaps.map((roadmap) => (
            <div key={roadmap.id} className="rounded-lg overflow-hidden">
                <RoadmapVisualization
                  isEditable={false}
                  roadmap={{
                    id: roadmap.id || '',
                    final_goal: roadmap.final_goal || 'Completed Roadmap',
                    title: roadmap.title || 'Untitled Roadmap',
                    description: roadmap?.description || 'No description available',
                    start_date: roadmap?.start_date || new Date().toISOString().split('T')[0],
                    end_date: roadmap?.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    cover_image_url: roadmap?.cover_image_url || undefined,
                    is_public: roadmap?.is_public || false,
                  // Ensure we always have at least one milestone for completed roadmaps
                  milestones: (roadmap.milestones && roadmap.milestones.length > 0) 
                    ? roadmap.milestones.map(milestone => ({
                    id: milestone?.id || `milestone-${Math.random().toString(36).substr(2, 9)}`,
                    title: milestone?.title || 'Untitled Milestone',
                    description: milestone?.description || null,
                    start_date: milestone?.start_date || null,
                    end_date: milestone?.end_date || null,
                    status: (milestone?.status as 'pending' | 'in_progress' | 'completed' | 'blocked') || 'completed',
                    order_index: milestone?.order_index || 0,
                    isCompleted: milestone?.status === 'completed',
                    tasks: (milestone?.tasks || []).map(task => ({
                      id: task?.id || `task-${Math.random().toString(36).substr(2, 9)}`,
                      title: task?.title || 'Untitled Task',
                      description: task?.description || '',
                      status: (task?.status as 'todo' | 'in_progress' | 'done') || 'done',
                      milestone_id: milestone?.id || '',
                      order_index: task?.order_index || 0,
                      due_date: task?.due_date || null,
                      priority: (task?.priority as 'low' | 'medium' | 'high') || 'medium',
                      created_at: task?.created_at || new Date().toISOString(),
                      updated_at: task?.updated_at || new Date().toISOString()
                    }))
                  }))
                  : [{
                      id: 'default-milestone',
                      title: 'Completed',
                      description: 'This roadmap has been completed',
                      start_date: roadmap.start_date || new Date().toISOString().split('T')[0],
                      end_date: roadmap.end_date || new Date().toISOString().split('T')[0],
                      status: 'completed' as const,
                      order_index: 0,
                      isCompleted: true,
                      tasks: []
                    }],
                  status: 'completed' as const,
                  updated_at: roadmap.completed_at
                }}
                progress={roadmap.progress}
                totalTasks={roadmap.totalTasks}
                completedTasks={roadmap.completedTasks}
                isDeleteDialogOpen={false}
                isDeleting={false}
                onEditClick={noop}
                onDeleteClick={noop}
                onDeleteConfirm={asyncNoop}
                onDeleteCancel={noop}
                onCompleteConfirm={asyncNoop}
                onCompletionDismiss={noop}
                showActions={false}
                onTaskStatusChange={handleTaskStatusChange}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
