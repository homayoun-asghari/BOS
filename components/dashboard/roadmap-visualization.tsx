"use client";

import { useState } from 'react';
import { RoadmapModal } from '@/components/roadmap/roadmap-modal';
import { useRoadmapData } from '@/hooks/useRoadmapData';
import { RoadmapHeader } from './RoadmapHeader';
import { EnhancedRoadmapTimeline } from './EnhancedRoadmapTimeline';
import { toast } from 'sonner';

export interface TaskType {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  status: 'todo' | 'in_progress' | 'completed' | 'done';
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
  
  const {
    roadmap: roadmapFromHook,
    loading,
    error,
    refresh: fetchRoadmapData,
    deleteRoadmap,
    updateTaskStatus,
  } = useRoadmapData();

  // Type assertion with proper type checking
  const roadmap = roadmapFromHook as unknown as RoadmapType;



  if (loading) {
    return <div className="p-4 text-foreground/80">Loading roadmap...</div>;
  }

  if (error) {
    return <div className="p-4 text-destructive">{error}</div>;
  }

  if (!roadmap) {
    return (
      <div className="flex h-64 items-center justify-center text-foreground/60">
        No roadmap found. Create one to get started!
      </div>
    );
  }

  // Timeline calculations - using the dates from the roadmap
  const startDate = new Date(roadmap.start_date || new Date().toISOString());
  const endDate = new Date(roadmap.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

  // Calculate progress
  const calculateProgress = () => {
    if (!roadmap?.milestones) return { totalTasks: 0, completedTasks: 0, progress: 0 };
    
    let total = 0;
    let completed = 0;
    
    roadmap.milestones.forEach((milestone) => {
      milestone.tasks?.forEach((task) => {
        total++;
        if (task.status === 'completed' || task.status === 'done') {
          completed++;
        }
      });
    });
    
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { totalTasks: total, completedTasks: completed, progress };
  };
  
  const { totalTasks, completedTasks, progress } = calculateProgress();
  
  // Handle task status update
  const handleTaskStatusChange = async (taskId: string, status: TaskType['status']) => {
    if (!roadmap) return false;
    
    try {
      const success = await updateTaskStatus(taskId, status);
      if (success) {
        await fetchRoadmapData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating task status:', error);
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
  


  return (
    <div className="w-full">
      <RoadmapHeader
        roadmap={roadmap}
        progress={progress}
        totalTasks={totalTasks}
        completedTasks={completedTasks}
        isDeleteDialogOpen={isDeleteDialogOpen}
        isDeleting={isDeleting}
        onEditClick={() => setIsEditModalOpen(true)}
        onDeleteClick={() => setIsDeleteDialogOpen(true)}
        onDeleteConfirm={handleDeleteRoadmap}
        onDeleteCancel={() => setIsDeleteDialogOpen(false)}
      />

      {/* Edit Roadmap Modal */}
      {roadmap && (
        <RoadmapModal 
          open={isEditModalOpen} 
          onOpenChange={setIsEditModalOpen}
          roadmap={{
            ...roadmap,
            start_date: roadmap.start_date || new Date().toISOString(),
            end_date: roadmap.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            milestones: roadmap.milestones || []
          }}
        />
      )}
      
      {/* Roadmap Content */}
      <div className="mt-6">
        <EnhancedRoadmapTimeline 
          startDate={startDate}
          endDate={endDate}
          milestones={roadmap.milestones}
          onTaskStatusChange={handleTaskStatusChange}
        />
      </div>
    </div>
  );
}
