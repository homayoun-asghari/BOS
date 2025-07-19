"use client";

import { useState } from 'react';
import { RoadmapModal } from '@/components/roadmap/roadmap-modal';
import { RoadmapHeader } from './RoadmapHeader';
import { BackupRoadmapTimeline } from './BackupRoadmapTimeline';
import { toast } from 'sonner';

// Import types from BackupRoadmapTimeline
import type { MilestoneType as TimelineMilestoneType } from './BackupRoadmapTimeline';





interface RoadmapVisualizationProps {
  roadmap?: {
    id: string;
    final_goal: string;
    start_date?: string;
    end_date?: string;
    cover_image_url?: string | null;
    milestones?: TimelineMilestoneType[];
  };
  progress: number;
  totalTasks: number;
  completedTasks: number;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => Promise<void>;
  onDeleteCancel: () => void;
  showActions?: boolean;
  isEditable?: boolean;
  onTaskStatusChange?: (taskId: string, status: 'todo' | 'in_progress' | 'done' | 'completed', priority?: 'low' | 'medium' | 'high') => Promise<boolean>;
}

export function RoadmapVisualization({ 
  roadmap, 
  isDeleteDialogOpen,
  onEditClick,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
  showActions = true,
  isEditable = true,
  onTaskStatusChange,
}: RoadmapVisualizationProps) {
  // State management
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Early return if no roadmap data
  if (!roadmap) {
    return null;
  }

  // Handle successful roadmap save
  const handleRoadmapSaved = () => {
    setIsEditModalOpen(false);
  };

  // Check if there are no milestones
  const hasNoMilestones = !roadmap?.milestones?.length;

  // Handle roadmap deletion
  const handleDeleteRoadmap = async () => {
    setIsDeleting(true);
    try {
      await onDeleteConfirm();
    } catch (error) {
      console.error('Error deleting roadmap:', error);
      toast.error('Failed to delete roadmap');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate progress based on completed milestones
  const calculateProgress = () => {
    if (!roadmap?.milestones?.length) return 0;
    
    const totalMilestones = roadmap.milestones.length;
    const completedMilestones = roadmap.milestones.filter(milestone => {
      const tasks = milestone.tasks || [];
      return tasks.length > 0 && tasks.every(task => task.status === 'done');
    }).length;
    
    return totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  };
  
  const currentProgress = calculateProgress();
  
  // Calculate milestone completion for display
  const totalMilestones = roadmap?.milestones?.length || 0;
  const completedMilestones = roadmap?.milestones?.filter(milestone => {
    const tasks = milestone.tasks || [];
    return tasks.length > 0 && tasks.every(task => task.status === 'done');
  }).length || 0;

  // Handle task status change
  const handleTaskStatusChange = async (taskId: string, status: 'todo' | 'in_progress' | 'done' | 'completed', priority?: 'low' | 'medium' | 'high') => {
    if (!roadmap || !onTaskStatusChange) return false;
    
    try {
      const success = await onTaskStatusChange(taskId, status, priority);
      if (success) {
        // The parent component will update the roadmap prop with the new state
        // The progress will be recalculated on the next render
      }
      return success;
    } catch (error) {
      console.error('Error updating task status:', error);
      return false;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky Header - Only in edit mode */}
      {isEditable && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <RoadmapHeader
            roadmap={roadmap}
            progress={currentProgress}
            totalTasks={totalMilestones}
            completedTasks={completedMilestones}
            isDeleteDialogOpen={isDeleteDialogOpen}
            isEditable={isEditable}
            isDeleting={isDeleting}
            onEditClick={onEditClick}
            onDeleteClick={onDeleteClick}
            onDeleteConfirm={handleDeleteRoadmap}
            onDeleteCancel={onDeleteCancel}
            showActions={showActions}
          />
        </div>
      )}

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {hasNoMilestones ? (
          <div className="h-full flex flex-col items-center justify-center py-12">
            <div className="max-w-md w-full text-center">
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
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full">
            {/* Non-sticky header for view mode */}
            {!isEditable && (
              <div className="mb-6">
                <RoadmapHeader
                  roadmap={roadmap}
                  progress={currentProgress}
                  totalTasks={totalMilestones}
                  completedTasks={completedMilestones}
                  isDeleteDialogOpen={isDeleteDialogOpen}
                  isEditable={false}
                  isDeleting={isDeleting}
                  onEditClick={onEditClick}
                  onDeleteClick={onDeleteClick}
                  onDeleteConfirm={handleDeleteRoadmap}
                  onDeleteCancel={onDeleteCancel}
                  showActions={false}
                />
              </div>
            )}
            
            {/* Timeline Content */}
            <BackupRoadmapTimeline 
              milestones={roadmap?.milestones || []}
              onTaskStatusChange={isEditable ? handleTaskStatusChange : undefined}
            />
          </div>
        )}
      </div>

      {/* Edit Roadmap Modal */}
      {roadmap && isEditModalOpen && (
        <RoadmapModal 
          open={isEditModalOpen} 
          onOpenChange={setIsEditModalOpen}
          onSave={handleRoadmapSaved}
          roadmap={{
            ...roadmap,
            start_date: roadmap.start_date || new Date().toISOString(),
            end_date: roadmap.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            milestones: roadmap.milestones || []
          }}
          key={roadmap.id}
        />
      )}
    </div>
  );
}
