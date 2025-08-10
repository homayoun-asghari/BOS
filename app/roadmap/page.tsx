"use client";

import { useState, useEffect } from "react";
import { RoadmapVisualization } from "@/components/dashboard/roadmap-visualization";
import { useRefresh } from "@/contexts/RefreshContext";
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
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  is_public: boolean;
  progress: number;
  milestones: MilestoneType[];
  created_at?: string;
  updated_at?: string;
}

function DashboardContent() {
  // Removed unused initializeNewRoadmap function
  const [roadmap, setRoadmap] = useState<Roadmap | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  
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
  
  // Fetch the latest roadmap data
  const fetchRoadmap = async () => {
    try {
      console.log('=== DEBUG: Starting fetchRoadmap ===');
      
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        console.log('=== DEBUG: No session, returning early ===');
        return;
      }

      const userId = session.data.session.user.id;
      console.log('=== DEBUG: User ID:', userId, '===');
      
      // First check for completed roadmaps
      console.log('=== DEBUG: Checking for completed roadmaps ===');
      const hasCompleted = await checkCompletedRoadmaps(userId);
      console.log('=== DEBUG: Has completed roadmaps:', hasCompleted, '===');
      
      // If we have completed roadmaps but no current one, we're done
      if (hasCompleted) {
        console.log('=== DEBUG: Has completed roadmaps, setting roadmap to undefined ===');
        setRoadmap(undefined);
        return;
      }

      const { data: roadmapData, error: roadmapError } = await supabase
        .rpc('get_current_roadmap', { user_id: userId });

      if (roadmapError) {
        console.error('Error fetching roadmap:', roadmapError);
        return;
      }

      // Transform the JSONB response using the toRoadmap converter
      if (roadmapData) {
        const storedProcRoadmap = roadmapData as StoredProcedureRoadmap;
        const transformedRoadmap = toRoadmap(storedProcRoadmap);
        
        if (transformedRoadmap) {
          setRoadmap({
            id: roadmapData.id,
            title: roadmapData.title,
            description: roadmapData.description,
            final_goal: roadmapData.final_goal,
            start_date: roadmapData.start_date,
            end_date: roadmapData.end_date,
            cover_image_url: roadmapData.cover_image_url,
            status: roadmapData.status || 'draft',
            is_public: roadmapData.is_public || false,
            progress: calculateProgress(transformedRoadmap),
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

  const refresh = useRefresh();
  const triggerRefresh = refresh.triggerRefresh;

  // Handle completion confirmation
  const handleCompleteRoadmap = async () => {
    if (!roadmap) return false;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('roadmaps')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString() 
        })
        .eq('id', roadmap.id);
        
      if (error) throw error;
      

      
      // Clear the current roadmap to trigger the empty state
      setRoadmap(undefined);
      
      // Trigger stats refresh
      triggerRefresh();
      
      toast.success('Roadmap marked as completed!');
      return true;
    } catch (error) {
      console.error('Error completing roadmap:', error);
      toast.error('Failed to mark roadmap as completed');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Handle roadmap shutdown (mark as unfinished)
  const handleShutdownRoadmap = async () => {
    if (!roadmap) return false;
    
    try {
      setLoading(true);
      
      // Call the database function to update status to 'unfinished'
      const { data, error } = await supabase
        .rpc('update_roadmap_status_to_unfinished', { roadmap_id: roadmap.id });
        
      if (error) throw error;
      
      if (data) {
        // Refresh the roadmap data
        await fetchRoadmap();
        // Trigger stats refresh
        triggerRefresh();
        toast.success('Roadmap marked as unfinished');
      } else {
        toast.error('Failed to mark roadmap as unfinished');
      }
      
      return data;
    } catch (error) {
      console.error('Error shutting down roadmap:', error);
      toast.error('Failed to mark roadmap as unfinished');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Dismiss completion prompt
  const handleDismissCompletion = () => {
    setShowCompletionPrompt(false);
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
      
      // First, delete all posts related to this roadmap
      const { error: postsError } = await supabase
        .from('posts')
        .delete()
        .eq('roadmap_id', roadmap.id);
      
      if (postsError) throw postsError;
      
      // Then, delete all related milestones and tasks
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
  
  // Function to check if user has any completed roadmaps
  const checkCompletedRoadmaps = async (userId?: string) => {
    try {
      // If userId is not provided, get it from the session
      let effectiveUserId = userId;
      if (!effectiveUserId) {
        const session = await supabase.auth.getSession();
        effectiveUserId = session.data.session?.user?.id;
        if (!effectiveUserId) {
          console.log('No user session found');
          return false;
        }
      }
      
      console.log('=== DEBUG: Checking for completed roadmaps for user:', effectiveUserId, '===');
      
      // First get all roadmaps to debug
      const { data: allRoadmaps, error: allError } = await supabase
        .from('roadmaps')
        .select('id, status, title')
        .eq('user_id', effectiveUserId);
        
      if (allError) throw allError;
      console.log('All roadmaps:', allRoadmaps);
      
      // Then specifically check for completed ones
      const { data: completedRoadmaps, error: completedError } = await supabase
        .from('roadmaps')
        .select('id, status, title')
        .eq('user_id', effectiveUserId)
        .eq('status', 'completed');
      
      if (completedError) throw completedError;
      console.log('Completed roadmaps:', completedRoadmaps);
      
      const hasCompleted = completedRoadmaps.length > 0;
      console.log('Has completed roadmaps:', hasCompleted);
      

      return hasCompleted;
      
    } catch (error) {
      console.error('Error checking completed roadmaps:', error);
      return false;
    }
  };

  // Function to fetch the current roadmap
  const fetchCurrentRoadmap = async () => {
    try {
      console.log('=== DEBUG: Starting fetchCurrentRoadmap ===');
      const session = await supabase.auth.getSession();
      console.log('=== DEBUG: Auth session:', session, '===');
      
      if (!session.data.session?.user?.id) {
        console.log('=== DEBUG: No user session found ===');
        return null;
      }
      
      const userId = session.data.session.user.id;
      console.log('=== DEBUG: User ID:', userId, '===');
      
      // Check for completed roadmaps first
      console.log('=== DEBUG: Checking for completed roadmaps ===');
      await checkCompletedRoadmaps(userId);
      
      // Get current roadmap
      console.log('=== DEBUG: Fetching current roadmap ===');
      const { data, error } = await supabase
        .rpc('get_current_roadmap', { user_id: userId });
        
      if (error) {
        console.error('=== DEBUG: Error in get_current_roadmap RPC:', error, '===');
        throw error;
      }
      
      console.log('=== DEBUG: Current roadmap data from RPC:', data, '===');
      
      if (!data) {
        console.log('=== DEBUG: No current roadmap found, checking for any roadmaps ===');
        // Check if there are any roadmaps at all for this user
        const { data: anyRoadmap, error: roadmapsError } = await supabase
          .from('roadmaps')
          .select('id, status, title')
          .eq('user_id', userId)
          .limit(1);
          
        if (roadmapsError) {
          console.error('=== DEBUG: Error checking for any roadmaps:', roadmapsError, '===');
        } else {
          console.log('=== DEBUG: Found roadmaps:', anyRoadmap, '===');
        }
      }
      
      if (data) {
        const transformed = toRoadmap(data as StoredProcedureRoadmap);
        console.log('=== DEBUG: Transformed roadmap data:', transformed, '===');
        if (transformed) {
          setRoadmap(transformed);
          return transformed;
        }
      }
      
      return null;
    } catch (error) {
      console.error('=== DEBUG: Error in fetchCurrentRoadmap:', error, '===');
      return null;
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

        const userId = session.data.session.user.id;
        
        // First check for completed roadmaps
        console.log('=== DEBUG: Checking for completed roadmaps ===');
        // Removed completed roadmaps check since we're simplifying the empty state

        // Get current roadmap
        const { data: roadmapData, error: roadmapError } = await supabase
          .rpc('get_current_roadmap', { user_id: userId });

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
            const allMilestonesCompleted = transformedRoadmap.milestones?.every(milestone => 
              milestone.status === 'completed' || 
              milestone.tasks?.every(task => task.status === 'done')
            );
            
            // Only show completion prompt if all milestones are completed but roadmap isn't marked as completed
            if (allMilestonesCompleted && roadmapData.status !== 'completed') {
              setShowCompletionPrompt(true);
            }
            
            setRoadmap({
              id: roadmapData.id,
              title: roadmapData.title,
              description: roadmapData.description,
              final_goal: roadmapData.final_goal,
              start_date: roadmapData.start_date,
              end_date: roadmapData.end_date,
              cover_image_url: roadmapData.cover_image_url,
              status: roadmapData.status || 'draft',
              is_public: roadmapData.is_public || false,
              progress: calculateProgress(transformedRoadmap),
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
    <div className="flex flex-1 flex-col min-h-0 bg-background">
      <div className="flex flex-1 min-h-0">
        <div className="relative flex flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : !roadmap ? (
                  <div className="mt-8 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                    <h3 className="text-lg font-medium text-muted-foreground">You don&apos;t have any active roadmap yet</h3>
                    <p className="text-sm text-muted-foreground mt-2">Start new chapter of your life here</p>
                    <button
                      onClick={() => {
                        setIsEditModalOpen(true);
                      }}
                      className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Next?
                    </button>
                  </div>
                ) : (
                  <RoadmapVisualization
                    roadmap={{
                      ...roadmap,
                      start_date: roadmap.start_date || undefined,
                      end_date: roadmap.end_date || undefined,
                      cover_image_url: roadmap.cover_image_url || undefined,
                      is_public: roadmap.is_public,
                      milestones: (roadmap.milestones || []).map(m => ({
                        ...m,
                        tasks: (m.tasks || []).map(t => ({
                          ...t,
                          status: t.status,
                          milestone_id: m.id,
                          order_index: t.order_index || 0,
                          priority: t.priority || 'medium',
                          description: t.description || '',
                          created_at: t.created_at || new Date().toISOString(),
                          updated_at: t.updated_at || new Date().toISOString()
                        }))
                      }))
                    }}
                    isEditable={true}
                    progress={calculateProgress(roadmap)}
                    totalTasks={roadmap.milestones?.length || 0}
                    completedTasks={calculateCompletedMilestones(roadmap)}
                    showCompletionPrompt={showCompletionPrompt}
                    onCompleteConfirm={handleCompleteRoadmap}
                    onShutdownConfirm={handleShutdownRoadmap}
                    onCompletionDismiss={handleDismissCompletion}
                    onTaskStatusChange={async (taskId: string, status: 'todo' | 'in_progress' | 'done' | 'completed', priority: 'low' | 'medium' | 'high' = 'medium') => {
                      try {
                        const session = await supabase.auth.getSession();
                        if (!session.data.session) {
                          console.error('Not authenticated');
                          return false;
                        }
                        
                        // Find the milestone for this task
                        const taskMilestone = roadmap?.milestones?.find(milestone => 
                          milestone.tasks?.some(task => task.id === taskId)
                        );
                        
                        if (!taskMilestone) {
                          console.error('Could not find milestone for task:', taskId);
                          return false;
                        }
                        
                        const milestoneId = taskMilestone.id;
                        
                        // Update the task status in the database
                        const { error } = await supabase
                          .from('tasks')
                          .update({ 
                            status,
                            priority,
                            updated_at: new Date().toISOString() 
                          })
                          .eq('id', taskId);
                        
                        if (error) throw error;
                        
                        // Check if this task is being unchecked from a completed milestone
                        const isUncheckingFromCompleted = taskMilestone.status === 'completed' && status === 'todo';
                        
                        // Check if all tasks in the milestone are now complete
                        const allTasksComplete = taskMilestone.tasks?.every(task => 
                          task.id === taskId ? status === 'done' : task.status === 'done'
                        );
                        
                        // Update milestone status based on task completion
                        if (isUncheckingFromCompleted) {
                          // If unchecking from completed milestone, set to in_progress
                          const { error: milestoneError } = await supabase
                            .from('milestones')
                            .update({
                              status: 'in_progress',
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', milestoneId);
                            
                          if (milestoneError) {
                            console.error('Error updating milestone status to in_progress:', milestoneError);
                            throw milestoneError;
                          }
                          
                          // Since we're unchecking a task from a completed milestone,
                          // make sure to hide the completion prompt if it's shown
                          setShowCompletionPrompt(false);
                        } else if (allTasksComplete) {
                          // If all tasks in this milestone are done, update the milestone status
                          const { error: milestoneError } = await supabase
                            .from('milestones')
                            .update({ 
                              status: 'completed',
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', taskMilestone.id);
                            
                          if (milestoneError) {
                            console.error('Error updating milestone status to completed:', milestoneError);
                            throw milestoneError;
                          }
                          
                          // Check if all milestones are now completed
                          const { data: updatedMilestones, error: milestonesError } = await supabase
                            .from('milestones')
                            .select('status')
                            .eq('roadmap_id', roadmap.id);
                            
                          if (milestonesError) {
                            console.error('Error checking milestone statuses:', milestonesError);
                            return false;
                          }
                          
                          const allMilestonesAreCompleted = updatedMilestones.every(m => m.status === 'completed');
                          
                          // If all milestones are completed and roadmap isn't already completed,
                          // show the completion prompt instead of auto-completing
                          if (allMilestonesAreCompleted && roadmap.status !== 'completed') {
                            setShowCompletionPrompt(true);
                          } else if (showCompletionPrompt) {
                            // If not all milestones are completed but the prompt is still shown, hide it
                            setShowCompletionPrompt(false);
                          }
                        }
                        
                        // After successful update, trigger a stats refresh
                        // This ensures we always show the correct numbers
                        window.dispatchEvent(new CustomEvent('refreshStats'));
                        
                        // Update local state with proper type safety
                        setRoadmap(prev => {
                          if (!prev) return prev;
                          
                          const updatedMilestones = prev.milestones?.map(milestone => {
                            // If this is the milestone containing our updated task
                            if (milestone.id === milestoneId) {
                              const updatedTasks = milestone.tasks?.map(task => 
                                task.id === taskId 
                                  ? { 
                                      ...task, 
                                      status: status as 'todo' | 'in_progress' | 'done',
                                      priority: priority as 'low' | 'medium' | 'high'
                                    } 
                                  : task
                              ) || [];
                              
                              // Check if all tasks in this milestone are done
                              const allTasksDone = updatedTasks.every(t => t.status === 'done');
                              
                              return {
                                ...milestone,
                                tasks: updatedTasks,
                                status: allTasksDone ? 'completed' : milestone.status
                              };
                            }
                            return milestone;
                          });
                          
                          // Check if all milestones are now completed
                          const allMilestonesCompleted = updatedMilestones?.every(m => m.status === 'completed');
                          
                          // If all milestones are completed and roadmap isn't already completed,
                          // show the completion prompt
                          if (allMilestonesCompleted && prev.status !== 'completed') {
                            setShowCompletionPrompt(true);
                          }
                          
                          return {
                            ...prev,
                            milestones: updatedMilestones || []
                          };
                        });
                        
                        return true;
                      } catch (error) {
                        console.error('Error updating task status:', error);
                        toast.error('Failed to update task status');
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
                    onOpenChange={async (isOpen) => {
                      if (!isOpen) {
                        // When modal closes, refresh the roadmap data
                        await fetchCurrentRoadmap();
                      }
                      setIsEditModalOpen(isOpen);
                    }}
                    onSave={async () => {
                      // After save, refresh the roadmap data
                      await fetchCurrentRoadmap();
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
            </div>
          </div>
        </div>
      </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
