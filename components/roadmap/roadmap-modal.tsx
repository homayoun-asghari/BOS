'use client';

import { useState, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GoalSection } from './GoalSection';
import { MilestoneItem } from './MilestoneItem';
import type { Subtask } from './MilestoneItem';

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
        status: 'todo' | 'in_progress' | 'completed' | 'done';
        priority: 'low' | 'medium' | 'high';
        order_index: number;
      }>;
    }>;
  } | null;
}

export function RoadmapModal({ open, onOpenChange, roadmap, onSave }: RoadmapModalProps) {
  const [goal, setGoal] = useState(roadmap?.final_goal || '');
  const [goalStartDate, setGoalStartDate] = useState<Date | undefined>(
    roadmap?.start_date ? new Date(roadmap.start_date) : new Date()
  );
  const [goalEndDate, setGoalEndDate] = useState<Date | undefined>(
    roadmap?.end_date ? new Date(roadmap.end_date) : undefined
  );
  
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
          completed: task.status === 'completed' || task.status === 'done',
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

  const { user } = useUser();

  const handleSave = useCallback(async () => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    if (!goalStartDate || !goalEndDate) {
      console.error('Both start and end dates are required');
      return;
    }

    try {
      const formatDateForDB = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      let finalRoadmapId = roadmap?.id;

      if (roadmap?.id) {
        // Update existing roadmap
        const { error: roadmapError } = await supabase
          .from('roadmaps')
          .update({
            final_goal: goal,
            start_date: formatDateForDB(goalStartDate),
            end_date: formatDateForDB(goalEndDate),
            updated_at: new Date().toISOString()
          })
          .eq('id', roadmap.id);

        if (roadmapError) throw roadmapError;

        // Delete existing milestones and tasks to replace them
        const { error: deleteError } = await supabase
          .from('milestones')
          .delete()
          .eq('roadmap_id', roadmap.id);

        if (deleteError) throw deleteError;
      } else {
        // Create new roadmap
        const { data: newRoadmap, error: roadmapError } = await supabase
          .from('roadmaps')
          .insert({
            user_id: user.id,
            title: 'My Roadmap',
            final_goal: goal,
            start_date: formatDateForDB(goalStartDate),
            end_date: formatDateForDB(goalEndDate),
            status: 'in_progress'
          })
          .select('id')
          .single();

        if (roadmapError) throw roadmapError;
        finalRoadmapId = newRoadmap.id;
      }

      if (!finalRoadmapId) {
        throw new Error('Failed to create or update roadmap');
      }

      // Process all milestones
      for (const milestone of milestones) {
        const { data: savedMilestone, error: milestoneError } = await supabase
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

        if (milestoneError) throw milestoneError;

        const tasksToInsert = milestone.subtasks.map((subtask, index) => ({
          milestone_id: savedMilestone.id,
          title: subtask.title || 'Untitled Task',
          status: subtask.completed ? 'done' : 'todo',
          priority: subtask.priority || 'medium',
          due_date: subtask.dueDate ? formatDateForDB(subtask.dueDate) : null,
          order_index: index
        }));

        if (tasksToInsert.length > 0) {
          const { error: tasksError } = await supabase
            .from('tasks')
            .insert(tasksToInsert);

          if (tasksError) throw tasksError;
        }
      }

      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving roadmap:', error);
      
      // Log additional error details if available
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      } else if (error) {
        console.error('Error details:', JSON.stringify(error, null, 2));
      }
      
      // Show a more descriptive error message to the user
      toast.error('Failed to save roadmap. Please check the console for details.');
      console.error('Error saving roadmap:', error);
    }
  }, [user, goal, goalStartDate, goalEndDate, milestones, onOpenChange, roadmap?.id, onSave]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="px-1">
          <DialogTitle className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">What Do You Want?</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <GoalSection
            goal={goal}
            onGoalChange={setGoal}
            startDate={goalStartDate}
            onStartDateChange={setGoalStartDate}
            endDate={goalEndDate}
            onEndDateChange={setGoalEndDate}
          />

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
            <Button onClick={handleSave} className="w-full sm:w-auto">
              Save Roadmap
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
