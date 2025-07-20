import { TaskType } from '@/components/dashboard/BackupRoadmapTimeline';
import { MilestoneType as TimelineMilestoneType } from '@/components/dashboard/BackupRoadmapTimeline';

export interface StoredProcedureTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  due_date: string | null;
  priority?: 'low' | 'medium' | 'high';
  order_index?: number;
  milestone_id?: string;
  created_at?: string;
  updated_at?: string;
  status?: 'todo' | 'in_progress' | 'done' | 'completed';
}

export interface StoredProcedureMilestone {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  tasks: StoredProcedureTask[];
}

export interface StoredProcedureRoadmap {
  id: string;
  title: string;
  description: string | null;
  final_goal: string;
  start_date: string | null;
  end_date: string | null;
  cover_image_url?: string | null;
  status?: 'draft' | 'in_progress' | 'completed' | 'archived';
  is_public: boolean;
  progress: number;
  milestones: StoredProcedureMilestone[];
}

// Converters to transform stored procedure types to component types
export function toTask(task: StoredProcedureTask): TaskType {
  // Preserve the original priority if it exists and is valid, otherwise default to 'medium'
  const priority = (task.priority && ['low', 'medium', 'high'].includes(task.priority))
    ? task.priority as 'low' | 'medium' | 'high'
    : 'medium';
  
  // Debug log to track task data and priority
  console.log('toTask - Processing task:', {
    id: task.id,
    title: task.title,
    originalPriority: task.priority,
    normalizedPriority: priority,
    status: task.status,
    completed: task.completed
  });
  
  // Determine status - prioritize explicit status, otherwise use completed flag
  const status = task.status || (task.completed ? 'done' : 'todo');
  
  return {
    id: task.id,
    title: task.title,
    description: task.description || '',
    due_date: task.due_date ?? null,
    status: status === 'completed' ? 'done' : status, // Normalize 'completed' to 'done'
    priority,
    order_index: task.order_index || 0,
    milestone_id: task.milestone_id || '',
    created_at: task.created_at || new Date().toISOString(),
    updated_at: task.updated_at || new Date().toISOString()
  };
}

export function toMilestone(milestone: StoredProcedureMilestone): TimelineMilestoneType {
  return {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    start_date: milestone.start_date ?? null,
    end_date: milestone.end_date ?? null,
    status: 'in_progress', // Default status since not in stored proc
    order_index: 0, // Default order index since not in stored proc
    tasks: milestone.tasks.map(toTask)
  };
}

export function toRoadmap(roadmap: StoredProcedureRoadmap | null | undefined) {
  if (!roadmap) {
    console.error('Cannot transform null or undefined roadmap data');
    return null;
  }

  try {
    const result = {
      id: roadmap.id,
      title: roadmap.title,
      description: roadmap.description || '',
      final_goal: roadmap.final_goal || 'No goal set',
      start_date: roadmap.start_date || null,
      end_date: roadmap.end_date || null,
      cover_image_url: roadmap.cover_image_url || null,
      status: roadmap.status || 'draft', // Default to 'draft' if status is not provided
      is_public: roadmap.is_public || false, // Default to false if not provided
      progress: typeof roadmap.progress === 'number' ? roadmap.progress : 0,
      milestones: Array.isArray(roadmap.milestones) 
        ? roadmap.milestones.map(milestone => toMilestone(milestone)).filter(Boolean) 
        : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as const;

    console.log('Successfully transformed roadmap:', {
      id: result.id,
      title: result.title,
      milestoneCount: result.milestones.length
    });

    return result;
  } catch (error) {
    console.error('Error transforming roadmap data:', error, {
      roadmapId: roadmap?.id,
      roadmapTitle: roadmap?.title
    });
    return null;
  }
}
