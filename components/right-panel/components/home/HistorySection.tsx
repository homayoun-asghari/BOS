'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { RoadmapVisualization } from '@/components/dashboard/roadmap-visualization';

interface CompletedRoadmap {
  id: string;
  title: string;
  description: string | null;
  final_goal: string;
  start_date?: string | null;
  end_date?: string | null;
  cover_image_url?: string | null;
  is_public?: boolean;
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
  completed_at: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
}

interface HistorySectionProps {
  userId?: string; // Optional userId prop to fetch roadmaps for a specific user
}

export function HistorySection({ userId: propUserId }: HistorySectionProps = {}) {
  const [completedRoadmaps, setCompletedRoadmaps] = useState<CompletedRoadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [hasFetched, setHasFetched] = useState(false);
  
  // Define callbacks at the top level
  const handleTaskStatusChange = useCallback(async () => {
    // No-op for completed roadmaps
    return false;
  }, []);

  const noop = useCallback(() => {}, []);
  const asyncNoop = useCallback(async () => {}, []);

  useEffect(() => {
    const fetchCompletedRoadmaps = async () => {
      // Use propUserId if provided, otherwise fall back to authenticated user's ID
      const targetUserId = propUserId || user?.id;
      console.log('Fetching completed roadmaps for user:', targetUserId, 'isProfileView:', !!propUserId);
      if (!targetUserId || hasFetched) {
        console.log('Skipping fetch - missing userId or already fetched');
        return;
      }
      
      try {
        setLoading(true);
        
        // Use the get_completed_roadmaps function
        const isPublicOnly = !!(propUserId && propUserId !== user?.id);
        const { data: roadmapData, error } = await supabase
          .rpc('get_completed_roadmaps', {
            user_id: targetUserId,
            is_public_only: isPublicOnly
          });
          
        if (error) {
          console.error('Error fetching completed roadmaps:', error);
          return;
        }
        
        console.log('Fetched completed roadmaps:', roadmapData);
        
        // Transform the data to match our interface
        const formattedData = (roadmapData || []).map(roadmap => ({
          id: roadmap.id,
          title: roadmap.title,
          description: roadmap.description,
          final_goal: roadmap.final_goal || '',
          start_date: roadmap.start_date,
          end_date: roadmap.end_date,
          cover_image_url: roadmap.cover_image_url,
          is_public: roadmap.is_public,
          milestones: (roadmap.milestones || []).map((m: any) => ({
            ...m,
            tasks: (m.tasks || []).map((t: any) => ({
              ...t,
              milestone_id: m.id,
              created_at: t.created_at || new Date().toISOString(),
              updated_at: t.updated_at || new Date().toISOString()
            }))
          })),
          completed_at: roadmap.completed_at,
          progress: roadmap.total_tasks > 0 
            ? Math.round((roadmap.completed_tasks / roadmap.total_tasks) * 100) 
            : 0,
          totalTasks: roadmap.total_tasks,
          completedTasks: roadmap.completed_tasks
        }));
        
        console.log('Formatted completed roadmaps:', formattedData);
        setCompletedRoadmaps(formattedData);
        setHasFetched(true);
      } catch (error) {
        console.error('Error fetching completed roadmaps:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedRoadmaps();
  }, [user, hasFetched, propUserId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (completedRoadmaps.length === 0) {
    console.log('No completed roadmaps to display. State:', {
      loading,
      hasFetched,
      user: user?.id,
      propUserId,
      completedRoadmapsCount: completedRoadmaps.length,
      completedRoadmaps
    });
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No completed roadmaps yet.</p>
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
          {completedRoadmaps.map((roadmap) => (
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
