'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { roadmapVectorService } from '@/lib/roadmap/roadmap-vector-service';

import { Button } from '@/components/ui/button';
import { deleteRoadmapCover } from '@/lib/utils/roadmap-cover-utils';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

import { GoalSection } from './GoalSection';
import { MilestoneItem } from './MilestoneItem';
import type { Subtask } from './MilestoneItem';
import { CoverImageUpload, type CoverImage } from './cover-image-upload';

interface Milestone {
  id: string;
  title: string;
  startDate?: Date;
  endDate?: Date;
  subtasks: Subtask[];
}

interface RoadmapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
  roadmap?: {
    id: string;
    final_goal: string;
    start_date: string;
    end_date: string;
    is_public: boolean;
    cover_image_url?: string | null;
    milestones: Array<{
      id: string;
      title: string;
      description: string | null;
      start_date: string | null;
      end_date: string | null;
      order_index: number;
      tasks: Array<{
        id: string;
        title: string;
        description: string;
        due_date: string | null;
        status: 'todo' | 'in_progress' | 'done';
        priority: 'low' | 'medium' | 'high';
        order_index: number;
      }>;
    }>;
  } | null;
}

// Helper function to format date for database
function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to process tasks for a milestone
async function processMilestoneTasks(milestone: Milestone) {
  if (!milestone.id) return;
  
  // Get existing tasks for this milestone
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('milestone_id', milestone.id);
    
  const existingTaskIds = new Set(existingTasks?.map(t => t.id) || []);
  const processedTaskIds = new Set();
  
  // Process all subtasks
  const tasksToInsert = [];
  
  for (const [index, subtask] of milestone.subtasks.entries()) {
    // Ensure dueDate is properly handled whether it's a Date object or string
    const dueDate = subtask.dueDate ? 
      (subtask.dueDate instanceof Date ? formatDateForDB(subtask.dueDate) : subtask.dueDate) : 
      null;
      
    const taskData = {
      title: subtask.title || 'Untitled Task',
      status: subtask.completed ? 'done' : 'todo',
      priority: subtask.priority || 'medium',
      due_date: dueDate,
      order_index: index,
      updated_at: new Date().toISOString()
    };
    
    if (subtask.id && existingTaskIds.has(subtask.id)) {
      // Update existing task
      const { error: updateError } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', subtask.id);
        
      if (updateError) throw updateError;
      processedTaskIds.add(subtask.id);
    } else {
      // Prepare new task for batch insert
      tasksToInsert.push({
        ...taskData,
        milestone_id: milestone.id,
        created_at: new Date().toISOString()
      });
    }
  }
  
  // Batch insert new tasks
  if (tasksToInsert.length > 0) {
    const { data: newTasks, error: insertError } = await supabase
      .from('tasks')
      .insert(tasksToInsert)
      .select('id');
      
    if (insertError) throw insertError;
    newTasks?.forEach(task => processedTaskIds.add(task.id));
  }
  
  // Delete tasks that were removed
  const tasksToDelete = Array.from(existingTaskIds).filter(id => !processedTaskIds.has(id));
  if (tasksToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .in('id', tasksToDelete);
      
    if (deleteError) throw deleteError;
  }
}

export function RoadmapModal({ open, onOpenChange, roadmap, onSave }: RoadmapModalProps) {
  const { user } = useAuth();
  const [goal, setGoal] = useState(roadmap?.final_goal || '');
  const [goalStartDate, setGoalStartDate] = useState<Date | undefined>(
    roadmap?.start_date ? new Date(roadmap.start_date) : new Date()
  );
  const [goalEndDate, setGoalEndDate] = useState<Date | undefined>(
    roadmap?.end_date ? new Date(roadmap.end_date) : undefined
  );
  // Cover image state
  const [coverImage, setCoverImage] = useState<CoverImage | null>(
    roadmap?.cover_image_url 
      ? { url: roadmap.cover_image_url, path: '' } 
      : null
  );
  const [pendingCoverRemoval, setPendingCoverRemoval] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(roadmap?.is_public || false);
  
  // Prepare roadmap data for vector update
  const getRoadmapForVector = useCallback((currentGoal: string, currentMilestones: Milestone[]) => {
    if (!currentGoal) return undefined;
    
    return {
      goal: currentGoal,
      milestones: currentMilestones.map(milestone => ({
        title: milestone.title,
        description: '',
        tasks: (milestone.subtasks || []).map(task => ({
          title: task.title,
          description: ''
        }))
      }))
    };
  }, []);

  const [milestones, setMilestones] = useState<Milestone[]>(() => {
    if (roadmap?.milestones?.length) {
      return roadmap.milestones.map(milestone => ({
        id: milestone.id,
        title: milestone.title,
        startDate: milestone.start_date ? new Date(milestone.start_date) : undefined,
        endDate: milestone.end_date ? new Date(milestone.end_date) : undefined,
        subtasks: milestone.tasks?.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          completed: task.status === 'done',
          priority: task.priority,
          dueDate: task.due_date ? new Date(task.due_date) : undefined
        })) || []
      }));
    }
    
    // Default empty milestone if no roadmap or milestones
    return [{
      id: '1',
      title: '',
      startDate: undefined,
      endDate: undefined,
      subtasks: [{ 
        id: Date.now().toString(), 
        title: '', 
        completed: false,
        priority: 'medium' as const,
        dueDate: undefined 
      }]
    }];
  });

  const addMilestone = useCallback(() => {
    setMilestones(prevMilestones => [
      ...prevMilestones,
      {
        id: Date.now().toString(),
        title: '',
        startDate: undefined,
        endDate: undefined,
        subtasks: [{ id: Date.now().toString(), title: '', completed: false }]
      }
    ]);
  }, []);

  const removeMilestone = useCallback((id: string) => {
    setMilestones((prevMilestones) => prevMilestones.filter((m) => m.id !== id));
  }, []);

  const addSubtask = useCallback((milestoneId: string) => {
    setMilestones((prevMilestones) =>
      prevMilestones.map((m) => {
        if (m.id === milestoneId) {
          return {
            ...m,
            subtasks: [
              ...m.subtasks, 
              { 
                id: Date.now().toString(), 
                title: '', 
                completed: false,
                priority: 'medium' as const,
                dueDate: undefined
              }
            ]
          };
        }
        return m;
      })
    );
  }, []);

  const removeSubtask = useCallback((milestoneId: string, subtaskId: string) => {
    setMilestones((prevMilestones) =>
      prevMilestones.map((m) => {
        if (m.id === milestoneId) {
          const newSubtasks = m.subtasks.filter((s) => s.id !== subtaskId);
          if (newSubtasks.length === 0) {
            newSubtasks.push({ 
              id: Date.now().toString(), 
              title: '', 
              completed: false,
              priority: 'medium' as const,
              dueDate: undefined 
            });
          }
          return { ...m, subtasks: newSubtasks };
        }
        return m;
      })
    );
  }, []);

  const handleMilestoneTitleChange = (id: string, title: string) => {
    setMilestones(milestones.map(m => 
      m.id === id ? { ...m, title } : m
    ));
  };

  const handleMilestoneStartDateChange = (id: string, startDate?: Date) => {
    setMilestones(milestones.map(m => 
      m.id === id ? { ...m, startDate } : m
    ));
  };

  const handleMilestoneEndDateChange = (id: string, endDate?: Date) => {
    setMilestones(milestones.map(m => 
      m.id === id ? { ...m, endDate } : m
    ));
  };

  const handleTaskTitleChange = (milestoneId: string, taskId: string, title: string) => {
    setMilestones(milestones.map(m => ({
      ...m,
      subtasks: m.id === milestoneId 
        ? m.subtasks.map(t => t.id === taskId ? { ...t, title } : t)
        : m.subtasks
    })));
  };

  const handleTaskDueDateChange = (milestoneId: string, taskId: string, dueDate?: Date) => {
    setMilestones(milestones.map(m => ({
      ...m,
      subtasks: m.id === milestoneId
        ? m.subtasks.map(t => t.id === taskId ? { ...t, dueDate } : t)
        : m.subtasks
    })));
  };

  const handleTaskPriorityChange = (milestoneId: string, taskId: string, priority: 'low' | 'medium' | 'high') => {
    setMilestones(milestones.map(m => ({
      ...m,
      subtasks: m.id === milestoneId
        ? m.subtasks.map(t => t.id === taskId ? { ...t, priority } : t)
        : m.subtasks
    })));
  };

  const handleCoverImageChange = useCallback((newCoverImage: CoverImage | null) => {
    setCoverImage(newCoverImage);
    if (!newCoverImage) {
      setPendingCoverRemoval(true);
    }
  }, []);

  // Get validation error message
  const getValidationError = useCallback((currentGoal: string | undefined): string | null => {
    if (!currentGoal || !currentGoal.trim()) return 'Goal is required';
    if (!goalStartDate) return 'Start date is required';
    if (!goalEndDate) return 'End date is required';
    if (goalStartDate && goalEndDate && goalStartDate >= goalEndDate) return 'End date must be after start date';
    if (milestones.length === 0) return 'At least one milestone is required';
    
    for (const [index, milestone] of milestones.entries()) {
      if (!milestone?.title?.trim()) return `Milestone ${index + 1} is missing a title`;
      
      for (const [taskIndex, task] of (milestone.subtasks || []).entries()) {
        if (!task?.title?.trim()) return `Milestone ${index + 1}, Task ${taskIndex + 1} is missing a title`;
      }
    }
    
    return null;
  }, [goalStartDate, goalEndDate, milestones]);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    if (!goal.trim()) return false;
    if (!goalStartDate || !goalEndDate) return false;
    if (milestones.length === 0) return false;
    
    // Check all milestones have required fields
    for (const milestone of milestones) {
      if (!milestone.title.trim()) return false;
      
      // Check all tasks have required fields
      for (const task of milestone.subtasks) {
        if (!task.title.trim()) return false;
      }
    }
    
    return true;
  }, [goal, goalStartDate, goalEndDate, milestones]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast.error('You must be logged in to save a roadmap');
      return;
    }
    
    setIsSaving(true);
    
    const error = getValidationError(goal);
    if (error) {
      toast.error(error);
      setIsSaving(false);
      return;
    }

    try {
      // Track if we need to clean up the old cover image
      let oldCoverImagePath: string | null = null;
// ... (rest of the code remains the same)
      
      // If we're updating an existing roadmap and it has a cover image
      if (roadmap?.id && roadmap.cover_image_url) {
        // If we have a new cover image that's different from the old one
        const isCoverChanged = coverImage?.url && coverImage.url !== roadmap.cover_image_url;
        // Or if we're removing the cover image
        const isCoverRemoved = !coverImage?.url && !pendingCoverRemoval;
        
        if (isCoverChanged || isCoverRemoved || pendingCoverRemoval) {
          // Store the old cover image path for cleanup after successful update
          oldCoverImagePath = roadmap.cover_image_url;
          console.log('Marked old cover image for cleanup:', oldCoverImagePath);
        }
      }
      
      // Handle pending cover image removal if needed (for new cover images that were uploaded but then removed)
      if (pendingCoverRemoval && coverImage?.path) {
        try {
          console.log('Removing unused uploaded cover image from storage:', coverImage.path);
          await deleteRoadmapCover(coverImage.path);
        } catch (error) {
          console.error('Error removing unused cover image:', error);
          // Continue with save even if cleanup fails
        }
        // Clear the pending removal flag
        setPendingCoverRemoval(false);
        // Clear the cover image since we're removing it
        setCoverImage(null);
      }
      // Using shared formatDateForDB function

      let finalRoadmapId = roadmap?.id;

      if (roadmap?.id) {
        // Prepare the update data with null checks for dates
        const updateData = {
          final_goal: goal,
          start_date: goalStartDate ? formatDateForDB(goalStartDate) : null,
          end_date: goalEndDate ? formatDateForDB(goalEndDate) : null,
          updated_at: new Date().toISOString(),
          cover_image_url: roadmap.cover_image_url || null,
          is_public: isPublic
        };
        
        // If we have a pending removal or no cover image, set cover_image_url to null
        // Otherwise, use the existing cover image URL
        if (pendingCoverRemoval || !coverImage) {
          updateData.cover_image_url = null;
        } else if (coverImage?.url) {
          updateData.cover_image_url = coverImage.url;
        }
        
        // Add is_public to the update data
        updateData.is_public = isPublic;
        
        // Update the roadmap
        const { error: roadmapError } = await supabase
          .from('roadmaps')
          .update(updateData)
          .eq('id', roadmap.id);

        if (roadmapError) throw roadmapError;
        
        // Get existing milestones for this roadmap
        const { data: existingMilestones } = await supabase
          .from('milestones')
          .select('id, tasks(id)')
          .eq('roadmap_id', roadmap.id);
          
        const existingMilestoneIds = new Set(existingMilestones?.map(m => m.id) || []);
        const processedMilestoneIds = new Set();
        
        // Process all milestones
        for (const milestone of milestones) {
          if (milestone.id && existingMilestoneIds.has(milestone.id)) {
            // Update existing milestone
            const { error: updateError } = await supabase
              .from('milestones')
              .update({
                title: milestone.title || 'Untitled Milestone',
                start_date: milestone.startDate ? formatDateForDB(milestone.startDate) : null,
                end_date: milestone.endDate ? formatDateForDB(milestone.endDate) : null,
                order_index: milestones.indexOf(milestone),
                updated_at: new Date().toISOString()
              })
              .eq('id', milestone.id);
              
            if (updateError) throw updateError;
            processedMilestoneIds.add(milestone.id);
          } else {
            // Create new milestone
            const { data: newMilestone, error: createError } = await supabase
              .from('milestones')
              .insert({
                roadmap_id: roadmap.id,
                title: milestone.title || 'Untitled Milestone',
                start_date: milestone.startDate ? formatDateForDB(milestone.startDate) : null,
                end_date: milestone.endDate ? formatDateForDB(milestone.endDate) : null,
                status: 'pending',
                order_index: milestones.indexOf(milestone)
              })
              .select('id')
              .single();
              
            if (createError) throw createError;
            milestone.id = newMilestone.id;
            processedMilestoneIds.add(newMilestone.id);
          }
          
          // Process tasks for this milestone
          await processMilestoneTasks(milestone);
        }
        
        // Delete milestones that were removed
        const milestonesToDelete = Array.from(existingMilestoneIds).filter(id => !processedMilestoneIds.has(id));
        if (milestonesToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('milestones')
            .delete()
            .in('id', milestonesToDelete);
            
          if (deleteError) throw deleteError;
        }
      } else {
        // Create new roadmap
        const { data: roadmapData, error: roadmapError } = await supabase
          .from('roadmaps')
          .insert({
            user_id: user.id,
            title: 'My Roadmap',
            final_goal: goal,
            start_date: goalStartDate ? formatDateForDB(goalStartDate) : null,
            end_date: goalEndDate ? formatDateForDB(goalEndDate) : null,
            cover_image_url: coverImage?.url || null,
            status: 'in_progress',
            is_public: isPublic
          })
          .select('id')
          .single();

        if (roadmapError) throw roadmapError;
        finalRoadmapId = roadmapData.id;
        
        // Create milestones and tasks for the new roadmap
        for (const milestone of milestones) {
          // Create new milestone
          const { data: newMilestone, error: createError } = await supabase
            .from('milestones')
            .insert({
              roadmap_id: finalRoadmapId,
              title: milestone.title || 'Untitled Milestone',
              start_date: milestone.startDate ? formatDateForDB(milestone.startDate) : null,
              end_date: milestone.endDate ? formatDateForDB(milestone.endDate) : null,
              status: 'pending',
              order_index: milestones.indexOf(milestone)
            })
            .select('id')
            .single();
            
          if (createError) throw createError;
          
          // Store the new milestone ID for task creation
          const milestoneId = newMilestone.id;
          
          // Process tasks for this milestone
          const tasks = milestone.subtasks || [];
          for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const { error: taskError } = await supabase
              .from('tasks')
              .insert({
                milestone_id: milestoneId,
                title: task.title || 'Untitled Task',
                description: '',
                due_date: task.dueDate ? formatDateForDB(new Date(task.dueDate)) : null,
                status: task.completed ? 'done' : 'todo',
                priority: task.priority || 'medium',
                order_index: i
              });
              
            if (taskError) throw taskError;
          }
        }
      } // Close the else block

      if (!finalRoadmapId) {
        throw new Error('Failed to create or update roadmap');
      }

      // Clean up the old cover image if it was changed or removed
      if (oldCoverImagePath) {
        console.log('Cleaning up old cover image from modal:', oldCoverImagePath);
        const deleted = await deleteRoadmapCover(oldCoverImagePath);
        if (!deleted) {
          console.warn('Failed to clean up old cover image from modal');
        }
      }

      // Update the roadmap vector after successful save
      try {
        console.log('Starting vector update process...');
        const roadmapForVector = getRoadmapForVector(goal, milestones);
        
        if (roadmapForVector && user?.id) {
          console.log(`Updating vector for user ${user.id}`);
          const result = await roadmapVectorService.updateRoadmapVector(
            user.id,
            roadmapForVector
          );
          
          if (!result.success) {
            console.error('Failed to update roadmap vector:', result.message);
            toast.error('Roadmap saved, but failed to update similarity data');
          } else {
            console.log('Roadmap vector updated successfully');
            
            // After updating vector, find and log similar users (for debugging)
            const similarUsers = await roadmapVectorService.findSimilarUsers(user.id, 5);
            console.log('Similar users:', similarUsers);
          }
        } else {
          console.log('Skipping vector update - missing roadmap data or user ID');
        }
      } catch (error) {
        console.error('Error updating roadmap vector:', error);
        // Don't fail the whole save if vector update fails
        toast.error('Roadmap saved, but failed to update similarity data');
      }

      if (onSave) onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving roadmap:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save roadmap');
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [
    user, 
    goal, 
    goalStartDate, 
    goalEndDate, 
    milestones, 
    onOpenChange, 
    roadmap?.id, 
    onSave, 
    coverImage,
    pendingCoverRemoval,
    roadmap?.cover_image_url,
    isPublic,
    getRoadmapForVector,
    getValidationError
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="pb-2">What Do YOU Want?</DialogTitle>
          </DialogHeader>
        
        {/* Cover Image Upload */}
        <div className="mb-6">
          <CoverImageUpload
            coverImage={coverImage}
            onCoverImageChange={handleCoverImageChange}
            onPendingRemovalChange={setPendingCoverRemoval}
            className="w-full"
          />
        </div>

        <div className="space-y-6">
          <GoalSection 
            goal={goal} 
            onGoalChange={setGoal} 
            startDate={goalStartDate} 
            onStartDateChange={setGoalStartDate}
            endDate={goalEndDate}
            onEndDateChange={setGoalEndDate}
          />
          
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPublic"
                checked={isPublic}
                onCheckedChange={(checked: boolean) => setIsPublic(checked)}
                className="border-foreground/30 dark:border-foreground/50 data-[state=checked]:bg-foreground/10 data-[state=checked]:border-foreground/50 dark:data-[state=checked]:bg-foreground/20"
              />
              <label htmlFor="isPublic" className="text-sm font-medium text-foreground">
                Make this roadmap public
              </label>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              Changing this will affect the visibility of your posts in this roadmap.
            </p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-base sm:text-lg font-medium">Milestones</h3>
            
            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <MilestoneItem
                  key={milestone.id}
                  id={milestone.id}
                  title={milestone.title}
                  startDate={milestone.startDate}
                  endDate={milestone.endDate}
                  onTitleChange={handleMilestoneTitleChange}
                  onStartDateChange={handleMilestoneStartDateChange}
                  onEndDateChange={handleMilestoneEndDateChange}
                  onAddTask={addSubtask}
                  onRemoveTask={removeSubtask}
                  onTaskTitleChange={handleTaskTitleChange}
                  onTaskDueDateChange={handleTaskDueDateChange}
                  onTaskPriorityChange={handleTaskPriorityChange}
                  onRemove={removeMilestone}
                  subtasks={milestone.subtasks}
                  index={index}
                  showRemove={milestones.length > 1}
                />
              ))}
              
              <Button 
                size="sm" 
                variant="outline" 
                onClick={addMilestone} 
                className="w-full mt-2"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Milestone
              </Button>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="mt-2 sm:mt-0">
              Cancel
            </Button>
            <div className="relative group">
              <Button 
                type="submit"
                disabled={!isFormValid || isSaving}
                className={`w-full sm:w-auto ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSaving ? 'Saving...' : 'Save Roadmap'}
              </Button>
              {!isFormValid && (
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {getValidationError(goal)}
                </div>
              )}
            </div>
          </div>
        </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
