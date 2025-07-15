"use client";

import { useState, useEffect, useCallback } from 'react';
import { RoadmapModal } from '@/components/roadmap/roadmap-modal';
import { useRoadmapData } from '@/hooks/useRoadmapData';
import { RoadmapHeader } from './RoadmapHeader';
import { BackupRoadmapTimeline } from './BackupRoadmapTimeline';
import { toast } from 'sonner';

export interface TaskType {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  order_index: number;
  milestone_id: string;
}

export interface MilestoneType {
  id: string;
  title: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  order_index: number;
  roadmap_id: string;
  tasks: TaskType[];
}

// Define the Roadmap interface with all required properties
interface RoadmapType {
  id: string;
  user_id: string;
  final_goal: string;
  created_at: string;
  updated_at: string;
  milestones: MilestoneType[];
  start_date: string;
  end_date: string;
  [key: string]: unknown;
}

export function RoadmapVisualization() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localRoadmap, setLocalRoadmap] = useState<RoadmapType | null>(null);
  
  const {
    roadmap: roadmapFromHook,
    loading,
    error,
    refresh: fetchRoadmapData,
    deleteRoadmap,
    updateTaskStatus,
  } = useRoadmapData();

  // Handle successful roadmap save
  const handleRoadmapSaved = useCallback(async () => {
    try {
      // Force refresh the roadmap data
      await fetchRoadmapData(true);
      // Close the modal after a short delay to allow the data to refresh
      setTimeout(() => setIsEditModalOpen(false), 300);
    } catch (error) {
      console.error('Error refreshing roadmap data:', error);
    }
  }, [fetchRoadmapData]);

  // Type assertion with proper type checking
  const roadmap = (roadmapFromHook as unknown as RoadmapType) || null;
  
  // Update localRoadmap when roadmap changes
  useEffect(() => {
    if (roadmap) {
      setLocalRoadmap(roadmap);
    }
  }, [roadmap]);



  // Show nothing while loading or if there's an error
  if (loading || error || !localRoadmap) {
    return null;
  }

  // Calculate progress based on milestones
  const calculateProgress = () => {
    if (!localRoadmap?.milestones || localRoadmap.milestones.length === 0) {
      return { totalMilestones: 0, completedMilestones: 0, progress: 0 };
    }
    
    const totalMilestones = localRoadmap.milestones.length;
    const completedMilestones = localRoadmap.milestones.filter(milestone => {
      // A milestone is considered complete if it has at least one task and all tasks are done
      return milestone.tasks && milestone.tasks.length > 0 && 
             milestone.tasks.every(task => task.status === 'done');
    }).length;
    
    const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
    return { totalMilestones, completedMilestones, progress };
  };
  
  const { totalMilestones, completedMilestones, progress } = calculateProgress();
  
  const handleTaskStatusChange = async (taskId: string, status: TaskType['status']) => {
    if (!localRoadmap) return false;
    
    try {
      // Optimistically update the local state
      const updatedMilestones = localRoadmap.milestones.map(milestone => ({
        ...milestone,
        tasks: milestone.tasks.map(task => 
          task.id === taskId ? { ...task, status } : task
        )
      }));
      
      // Update local state
      setLocalRoadmap({
        ...localRoadmap,
        milestones: updatedMilestones
      });
      
      // Update the server in the background
      updateTaskStatus(taskId, status).then(success => {
        if (!success) {
          // If server update fails, refetch data
          fetchRoadmapData().catch(console.error);
        }
      }).catch(console.error);
      
      return true; // Optimistic update was successful
    } catch (error) {
      console.error('Error updating task status:', error);
      // On error, refetch to ensure consistency
      fetchRoadmapData().catch(console.error);
      return false;
    }
  };
  
  // Handle roadmap deletion
  const handleDeleteRoadmap = async () => {
    if (!roadmap?.id) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteRoadmap(roadmap.id);
      if (success) {
        toast.success('Roadmap deleted successfully');
        // Use a small timeout to ensure the toast is visible before reloading
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Error deleting roadmap:', error);
      toast.error('Failed to delete roadmap');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };
  


  // Check if there are no milestones
  const hasNoMilestones = !localRoadmap?.milestones || localRoadmap.milestones.length === 0;

  return (
    <div className="w-full max-w-full lg:pr-[500px] mx-auto relative">
      <RoadmapHeader
        roadmap={localRoadmap}
        progress={progress}
        totalTasks={totalMilestones}
        completedTasks={completedMilestones}
        isDeleteDialogOpen={isDeleteDialogOpen}
        isDeleting={isDeleting}
        onEditClick={() => setIsEditModalOpen(true)}
        onDeleteClick={() => setIsDeleteDialogOpen(true)}
        onDeleteConfirm={handleDeleteRoadmap}
        onDeleteCancel={() => setIsDeleteDialogOpen(false)}
      />

      {hasNoMilestones && (
        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
          <h3 className="text-lg font-medium text-muted-foreground">No roadmap created yet</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Get started by creating your first milestone
          </p>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Create Roadmap
          </button>
        </div>
      )}

      {/* Edit Roadmap Modal */}
      {localRoadmap && isEditModalOpen && (
        <RoadmapModal 
          open={isEditModalOpen} 
          onOpenChange={setIsEditModalOpen}
          onSave={handleRoadmapSaved}
          roadmap={{
            ...localRoadmap,
            start_date: localRoadmap.start_date || new Date().toISOString(),
            end_date: localRoadmap.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            milestones: localRoadmap.milestones || []
          }}
          key={localRoadmap.id} // Add key to force re-render when roadmap changes
        />
      )}
      
      {/* Roadmap Content */}
      {!hasNoMilestones && (
        <div className="mt-6 pb-24">
          <BackupRoadmapTimeline 
            milestones={localRoadmap.milestones}
            onTaskStatusChange={handleTaskStatusChange}
          />
        </div>
      )}
    </div>
  );
}
