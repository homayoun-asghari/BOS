'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Clock, Diamond, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskType {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  milestone_id: string;
  order_index: number;
  due_date?: string | null;
  priority?: 'low' | 'medium' | 'high';
}

interface MilestoneType {
  id: string;
  title: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  order_index: number;
  roadmap_id: string;
  tasks: TaskType[];
}

interface BackupRoadmapTimelineProps {
  milestones: MilestoneType[];
  onTaskStatusChange: (taskId: string, status: 'todo' | 'in_progress' | 'done', priority?: 'low' | 'medium' | 'high') => Promise<boolean>;
}

export function BackupRoadmapTimeline({ 
  milestones, 
  onTaskStatusChange 
}: BackupRoadmapTimelineProps) {
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});
  const [pulsingTaskId, setPulsingTaskId] = useState<string | null>(null);
  const [isPulsing, setIsPulsing] = useState(true);

  // Find the task that should pulse (today's task or next upcoming)
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all tasks that are not done
    const allTasks = milestones.flatMap(milestone => 
      (milestone.tasks || []).map(task => ({
        ...task,
        dueDate: task.due_date ? new Date(task.due_date) : null,
        milestoneId: milestone.id,
        hasDueDate: !!task.due_date
      }))
    ).filter(task => task.status !== 'done');

    // Find today's tasks first
    const todaysTasks = allTasks.filter(task => 
      task.dueDate && 
      task.dueDate.getDate() === today.getDate() &&
      task.dueDate.getMonth() === today.getMonth() &&
      task.dueDate.getFullYear() === today.getFullYear()
    );

    // Sort tasks by due date (tasks without due date go to the end)
    const sortedTasks = [...allTasks].sort((a, b) => {
      // If both have due dates, sort by date
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      // If only one has a due date, it comes first
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      // If neither has a due date, maintain original order
      return 0;
    });

    // If there are tasks for today, use the first one
    // Otherwise, find the next upcoming task with a due date
    // If no tasks with due dates, use the first task without a due date
    let taskToPulse = null;
    
    if (todaysTasks.length > 0) {
      taskToPulse = todaysTasks[0];
    } else {
      // Find the first task with a future due date
      taskToPulse = sortedTasks.find(task => 
        task.dueDate && task.dueDate >= today
      );
      
      // If no future tasks, find the first task with a due date (past due)
      if (!taskToPulse) {
        taskToPulse = sortedTasks.find(task => task.dueDate !== null);
      }
      
      // If still no task, use the first task without a due date
      if (!taskToPulse && sortedTasks.length > 0) {
        taskToPulse = sortedTasks[0];
      }
    }

    if (taskToPulse) {
      setPulsingTaskId(taskToPulse.id);
      // Auto-expand the milestone containing the pulsing task
      setExpandedMilestones(prev => ({
        ...prev,
        [taskToPulse.milestoneId]: true
      }));
    }

    // Set up pulsing animation interval
    const interval = setInterval(() => {
      setIsPulsing(prev => !prev);
    }, 1500);

    return () => clearInterval(interval);
  }, [milestones]);

  const toggleMilestone = (milestoneId: string) => {
    setExpandedMilestones(prev => ({
      ...prev,
      [milestoneId]: !prev[milestoneId]
    }));
  };

  const handleTaskStatusChange = async (taskId: string, currentStatus: 'todo' | 'in_progress' | 'done') => {
    try {
      const newStatus = currentStatus === 'done' ? 'todo' : 'done';
      await onTaskStatusChange(taskId, newStatus);
      return true;
    } catch (error) {
      console.error('Error updating task status:', error);
      return false;
    }
  };


  const getStatusIcon = (status: 'todo' | 'in_progress' | 'done', priority?: 'low' | 'medium' | 'high') => {
    const priorityColor = priority === 'high' ? 'text-red-500' : 
                         priority === 'medium' ? 'text-amber-500' : 
                         priority === 'low' ? 'text-green-500' : 'text-gray-500';
    
    const borderColor = priority === 'high' ? 'border-red-500' : 
                       priority === 'medium' ? 'border-amber-500' : 
                       priority === 'low' ? 'border-green-500' : 'border-gray-300';
    
    switch (status) {
      case 'done':
        return <CheckCircle className={`w-4 h-4 ${priorityColor}`} />;
      case 'in_progress':
        return <Clock className={`w-4 h-4 ${priorityColor}`} />;
      default:
        return (
          <div className={`relative w-4 h-4 rounded-full border-2 ${borderColor} flex items-center justify-center`}>
            <Circle className={`w-3 h-3 ${status === 'todo' ? 'text-transparent' : priorityColor}`} />
          </div>
        );
    }
  };

  if (!milestones || milestones.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No milestones found</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <ol className="relative border-s border-gray-200 dark:border-gray-600 space-y-8">
        {milestones
          .sort((a, b) => a.order_index - b.order_index)
          .flatMap((milestone) => [
            // Milestone Item
            <li key={`milestone-${milestone.id}`} className="ms-4">
              <div className="absolute -start-2 -translate-y-1/2">
                <Diamond className="w-4 h-4 text-primary dark:text-primary-400" />
              </div>
              <div className="flex flex-col w-full">
                <div className="flex justify-between items-center w-full">
                  <div 
                    className="flex items-center cursor-pointer group flex-1"
                    onClick={() => toggleMilestone(milestone.id)}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary dark:group-hover:text-primary-400 transition-colors">
                      {milestone.title}
                    </h3>
                    {expandedMilestones[milestone.id] ? (
                      <ChevronDown className="w-5 h-5 ml-2 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 ml-2 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  {milestone.tasks && milestone.tasks.length > 0 && (
                    <div className={`flex items-center text-sm ${
                      milestone.tasks.every(t => t.status === 'done') 
                        ? 'text-green-500 dark:text-green-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    } bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md space-x-1`}>
                      {milestone.tasks.every(t => t.status === 'done') ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>All done</span>
                        </>
                      ) : (
                        <span>
                          {milestone.tasks.filter(t => t.status === 'done').length}/{milestone.tasks.length} done
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {milestone.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {milestone.description}
                  </p>
                )}
              </div>
            </li>,
            
            // Tasks for this milestone (only show if expanded)
            ...(expandedMilestones[milestone.id] && milestone.tasks?.sort((a, b) => a.order_index - b.order_index).map((task) => (
              <li 
                key={`task-${task.id}`} 
                className={cn(
                  "ms-8 mb-4 last:mb-0 transition-all duration-1000 ease-in-out",
                  pulsingTaskId === task.id && isPulsing && "opacity-70"
                )}
              >
                <div className="absolute w-2 h-2 bg-gray-300 rounded-full -start-1 translate-y-2"></div>
                <div className="flex">
                  <div className="flex-shrink-0 mr-2">
                    <button
                      onClick={() => handleTaskStatusChange(task.id, task.status)}
                      aria-label={task.status === 'done' ? 'Mark as todo' : 'Mark as done'}
                    >
                      {getStatusIcon(task.status, task.priority)}
                    </button>
                  </div>
                  <div className="flex flex-col">
                    {task.due_date && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                    <div className="relative">
                      <span className={`${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                        {task.title}
                      </span>
                      {pulsingTaskId === task.id && (
                        <span className="absolute -right-2 -top-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )) || [])
          ])}
      </ol>
    </div>
  );
}
