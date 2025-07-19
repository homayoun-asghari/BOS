"use client";

import { useState, useEffect } from "react";
import { RoadmapVisualization } from "@/components/dashboard/roadmap-visualization";
import { RightPanelProvider, RightPanel } from "@/components/right-panel";
import { ChatView } from "@/components/chat/chat-view";
import { PostsView } from "@/components/right-panel/components/posts-view";
import { StatsView } from "@/components/right-panel/components/stats-view";
import { useRightPanel } from "@/components/right-panel/context/right-panel-context";
import { supabase } from '@/lib/supabase/client';
// Removed unused import
import { toast } from 'sonner';
import { deleteRoadmapCover } from '@/lib/utils/roadmap-cover-utils';
import { StoredProcedureRoadmap, toRoadmap } from '@/types/roadmap';
import { RoadmapModal } from '@/components/roadmap/roadmap-modal';
import type { MilestoneType } from '@/components/dashboard/BackupRoadmapTimeline';

interface Roadmap {
  id: string;
  title: string;
  description: string;
  final_goal: string;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
  progress: number;
  milestones: MilestoneType[];
  created_at?: string;
  updated_at?: string;
}

function DashboardContent() {
  const { currentView } = useRightPanel();
  // Removed unused initializeNewRoadmap function
  const [roadmap, setRoadmap] = useState<Roadmap | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const calculateProgress = (roadmap: Roadmap | undefined) => {
    if (!roadmap?.milestones?.length) return 0;
    const total = roadmap.milestones.length;
    const completed = roadmap.milestones.filter(m => 
      m.tasks?.every(t => t.status === 'done')
    ).length;
    return Math.round((completed / total) * 100);
  };
  
  const calculateCompletedMilestones = (roadmap: Roadmap | undefined) => {
    if (!roadmap?.milestones?.length) return 0;
    return roadmap.milestones.filter(m => 
      m.tasks?.every(t => t.status === 'done')
    ).length;
  };
  
  // Handle roadmap deletion
  const handleDeleteRoadmap = async () => {
    if (!roadmap?.id) return;
    
    try {
      // If the roadmap has a cover image, delete it from storage
      if (roadmap.cover_image_url) {
        try {
          await deleteRoadmapCover(roadmap.cover_image_url);
        } catch (error) {
          console.error('Error deleting cover image:', error);
          // Continue with roadmap deletion even if cover image deletion fails
        }
      }
      
      // First, delete all related milestones and tasks
      const { data: milestones } = await supabase
        .from('milestones')
        .select('id')
        .eq('roadmap_id', roadmap.id);
      
      if (milestones && milestones.length > 0) {
        const milestoneIds = milestones.map(m => m.id);
        
        // Delete all tasks for these milestones
        const { error: tasksError } = await supabase
          .from('tasks')
          .delete()
          .in('milestone_id', milestoneIds);
          
        if (tasksError) throw tasksError;
        
        // Delete all milestones
        const { error: milestonesError } = await supabase
          .from('milestones')
          .delete()
          .in('id', milestoneIds);
          
        if (milestonesError) throw milestonesError;
      }
      
      // Finally, delete the roadmap itself
      const { error } = await supabase
        .from('roadmaps')
        .delete()
        .eq('id', roadmap.id);
      
      if (error) throw error;
      
      // Clear the current roadmap after successful deletion
      setRoadmap(undefined);
      toast.success('Roadmap deleted successfully');
      
      // Refresh the roadmap list
      fetchCurrentRoadmap();
      
    } catch (error) {
      console.error('Failed to delete roadmap:', error);
      toast.error('Failed to delete roadmap');
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };
  
  // Handle edit roadmap
  const handleEditClick = () => {
    if (!roadmap) return;
    setIsEditModalOpen(true);
  };
  
  // Function to fetch the current roadmap
  const fetchCurrentRoadmap = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.user?.id) {
        throw new Error('No user session found');
      }
      
      const { data, error } = await supabase
        .rpc('get_current_roadmap', { user_id: session.data.session.user.id });
        
      if (error) throw error;
      
      if (data) {
        const transformed = toRoadmap(data as StoredProcedureRoadmap);
        if (transformed) {
          setRoadmap(transformed);
        }
      }
    } catch (error) {
      console.error('Error fetching current roadmap:', error);
    }
  };
  
  // Note: Roadmap creation and updates are now handled in the RoadmapModal component
  // This keeps all roadmap modification logic in one place and prevents duplicate saves
  
  // Handle cancel delete
  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
  };

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          console.error('Not authenticated');
          return;
        }

        const { data: roadmapData, error: roadmapError } = await supabase
          .rpc('get_current_roadmap', { user_id: session.data.session.user.id });

        if (roadmapError) {
          console.error('Error fetching roadmap:', roadmapError);
          return;
        }

        // Transform the JSONB response using the toRoadmap converter
        if (roadmapData) {
          console.log('Raw roadmap data from stored procedure:', roadmapData);
          const storedProcRoadmap = roadmapData as StoredProcedureRoadmap;
          const transformedRoadmap = toRoadmap(storedProcRoadmap);
          console.log('Transformed roadmap data:', transformedRoadmap);
          
          if (transformedRoadmap) {
            setRoadmap({
              id: transformedRoadmap.id,
              title: transformedRoadmap.title,
              description: transformedRoadmap.description,
              final_goal: transformedRoadmap.final_goal,
              start_date: transformedRoadmap.start_date || undefined,
              end_date: transformedRoadmap.end_date || undefined,
              cover_image_url: transformedRoadmap.cover_image_url || null,
              milestones: transformedRoadmap.milestones || []
            });
          } else {
            console.error('Failed to transform roadmap data');
            setRoadmap(undefined);
          }
        } else {
          setRoadmap(undefined);
        }
      } catch (err) {
        console.error('Failed to fetch roadmap:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-50"></div>
      </div>
    );
  }

  return (
    <RightPanelProvider>
      <div className="flex flex-1 flex-col min-h-0 bg-background">
        <div className="flex flex-1 min-h-0">
          <div className="relative flex flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto lg:pr-[500px]">
              <div className="p-4 sm:p-6">
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : !roadmap ? (
                  <div className="mt-8 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                    <h3 className="text-lg font-medium text-muted-foreground">No roadmap created yet</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Get started by creating your first milestone
                    </p>
                    <button
                      onClick={() => {
                        setIsEditModalOpen(true);
                      }}
                      className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Create Roadmap
                    </button>
                  </div>
                ) : (
                  <RoadmapVisualization
                    roadmap={{
                      ...roadmap,
                      cover_image_url: roadmap.cover_image_url || null,
                      milestones: roadmap.milestones?.map(m => ({
                        ...m,
                        tasks: m.tasks?.map(t => ({
                          ...t,
                          status: t.status,
                          milestone_id: m.id,
                          order_index: t.order_index || 0,
                          priority: t.priority || 'medium',
                          description: t.description || '',
                          created_at: t.created_at || new Date().toISOString(),
                          updated_at: t.updated_at || new Date().toISOString()
                        })) || []
                      })) || []
                    }}
                    isEditable={true}
                    progress={calculateProgress(roadmap)}
                    totalTasks={roadmap.milestones?.length || 0}
                    completedTasks={calculateCompletedMilestones(roadmap)}
                    onTaskStatusChange={async (taskId: string, status: string, priority: string) => {
                      try {
                        const session = await supabase.auth.getSession();
                        if (!session.data.session) {
                          console.error('Not authenticated');
                          return false;
                        }
                        
                        const { error } = await supabase
                          .from('tasks')
                          .update({ 
                            status,
                            priority,
                            updated_at: new Date().toISOString() 
                          })
                          .eq('id', taskId);
                        
                        if (error) throw error;
                        
                        // Update local state
                        setRoadmap(prev => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            milestones: prev.milestones?.map(milestone => ({
                              ...milestone,
                              tasks: milestone.tasks?.map(task => 
                                task.id === taskId 
                                  ? { ...task, status, priority: priority || task.priority } 
                                  : task
                              )
                            }))
                          };
                        });
                        
                        return true;
                      } catch (err) {
                        console.error('Error updating task status:', err);
                        return false;
                      }
                    }}
                    onEditClick={handleEditClick}
                    onDeleteClick={() => setIsDeleteDialogOpen(true)}
                    onDeleteConfirm={handleDeleteRoadmap}
                    onDeleteCancel={handleCancelDelete}
                    isDeleteDialogOpen={isDeleteDialogOpen}
                    isDeleting={false}
                  />
                )}

                {/* Modal for creating/editing roadmap */}
                {isEditModalOpen && (
                  <RoadmapModal
                    open={isEditModalOpen}
                    onOpenChange={(isOpen) => {
                      if (!isOpen) {
                        // When modal closes, refresh the roadmap data
                        fetchCurrentRoadmap();
                      }
                      setIsEditModalOpen(isOpen);
                    }}
                    onSave={() => {
                      // After save, refresh the roadmap data
                      fetchCurrentRoadmap();
                    }}
                    roadmap={roadmap ? {
                      ...roadmap,
                      start_date: roadmap.start_date || new Date().toISOString(),
                      end_date: roadmap.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                      milestones: (roadmap.milestones || []).map(m => ({
                        ...m,
                        tasks: (m.tasks || []).map(t => ({
                          ...t,
                          status: t.status,
                          id: t.id,
                          title: t.title,
                          description: t.description || '',
                          milestone_id: m.id,
                          order_index: t.order_index || 0,
                          due_date: t.due_date,
                          priority: t.priority || 'medium',
                          created_at: t.created_at || new Date().toISOString(),
                          updated_at: t.updated_at || new Date().toISOString()
                        }))
                      }))
                    } : undefined}
                  />
                )}
              </div>
              {/* FAB removed as per request */}
            </div>
          </div>

          <RightPanel>
            {currentView === 'chat' && <ChatView />}
            {currentView === 'posts' && <PostsView />}
            {currentView === 'stats' && <StatsView />}
          </RightPanel>
        </div>
      </div>
    </RightPanelProvider>
  );
}

export default function DashboardPage() {
  return (
    <RightPanelProvider>
      <DashboardContent />
    </RightPanelProvider>
  );
}
