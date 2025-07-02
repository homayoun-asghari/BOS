import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { TaskItem } from './TaskItem';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
}

interface MilestoneItemProps {
  id: string;
  title: string;
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (id: string, date?: Date) => void;
  onEndDateChange: (id: string, date?: Date) => void;
  subtasks: Subtask[];
  index: number;
  showRemove: boolean;
  onTitleChange: (id: string, title: string) => void;
  onAddTask: (milestoneId: string) => void;
  onRemoveTask: (milestoneId: string, taskId: string) => void;
  onTaskTitleChange: (milestoneId: string, taskId: string, title: string) => void;
  onTaskDueDateChange: (milestoneId: string, taskId: string, dueDate?: Date) => void;
  onTaskPriorityChange: (milestoneId: string, taskId: string, priority: 'low' | 'medium' | 'high') => void;
  onRemove: (id: string) => void;
}

export function MilestoneItem({
  id,
  title,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  subtasks,
  index,
  showRemove,
  onTitleChange,
  onAddTask,
  onRemoveTask,
  onTaskTitleChange,
  onTaskDueDateChange,
  onTaskPriorityChange,
  onRemove,
}: MilestoneItemProps) {
  // Set default start date if not already set
  useEffect(() => {
    if (!startDate) {
      onStartDateChange(id, new Date());
    }
  }, [id, onStartDateChange, startDate]);
  
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-start">
        <h4 className="font-medium">Milestone {index + 1}</h4>
        {showRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onRemove(id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>

      <Input
        placeholder="Describe this milestone"
        value={title}
        onChange={(e) => onTitleChange(id, e.target.value)}
        className="h-9"
      />

      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-4">
          <DatePicker
            date={startDate}
            onSelect={(date) => onStartDateChange(id, date)}
            label="Start Date"
            placeholder="Pick start date"
          />
          <DatePicker
            date={endDate}
            onSelect={(date) => onEndDateChange(id, date)}
            label="End Date"
            placeholder="Pick end date"
            fromDate={startDate}
            disabled={(date) => startDate ? date < startDate : false}
          />
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Tasks</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onAddTask(id)}
          >
            <Plus className="h-3 w-3 mr-1" /> Add Task
          </Button>
        </div>

        <div className="space-y-2">
          {subtasks.map((subtask) => (
            <TaskItem
              key={subtask.id}
              id={subtask.id}
              title={subtask.title}
              dueDate={subtask.dueDate}
              priority={subtask.priority || 'medium'}
              onTitleChange={(taskId, newTitle) => onTaskTitleChange(id, taskId, newTitle)}
              onDueDateChange={(taskId, dueDate) => onTaskDueDateChange(id, taskId, dueDate)}
              onPriorityChange={(taskId, priority) => onTaskPriorityChange(id, taskId, priority)}
              onRemove={(taskId) => onRemoveTask(id, taskId)}
              showRemove={subtasks.length > 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
