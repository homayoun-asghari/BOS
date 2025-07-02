import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { TaskItem } from './TaskItem';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface MilestoneItemProps {
  id: string;
  title: string;
  deadline: Date | null;
  subtasks: Subtask[];
  index: number;
  showRemove: boolean;
  onTitleChange: (id: string, title: string) => void;
  onDeadlineChange: (id: string, deadline: Date | null) => void;
  onAddTask: (milestoneId: string) => void;
  onRemoveTask: (milestoneId: string, taskId: string) => void;
  onTaskTitleChange: (milestoneId: string, taskId: string, title: string) => void;
  onTaskToggleComplete: (milestoneId: string, taskId: string, completed: boolean) => void;
  onRemove: (id: string) => void;
}

export function MilestoneItem({
  id,
  title,
  deadline,
  subtasks,
  index,
  showRemove,
  onTitleChange,
  onDeadlineChange,
  onAddTask,
  onRemoveTask,
  onTaskTitleChange,
  onTaskToggleComplete,
  onRemove,
}: MilestoneItemProps) {
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

      <Textarea
        placeholder="Describe this milestone"
        value={title}
        onChange={(e) => onTitleChange(id, e.target.value)}
        className="min-h-[80px] resize-none"
      />

      <DatePicker
        date={deadline || undefined}
        onSelect={(date) => onDeadlineChange(id, date || null)}
        label="Deadline"
        placeholder="Pick a deadline"
      />

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

        {subtasks.map((subtask) => (
          <TaskItem
            key={subtask.id}
            id={subtask.id}
            title={subtask.title}
            completed={subtask.completed}
            onTitleChange={(taskId, newTitle) => onTaskTitleChange(id, taskId, newTitle)}
            onToggleComplete={(taskId, completed) => onTaskToggleComplete(id, taskId, completed)}
            onRemove={(taskId) => onRemoveTask(id, taskId)}
            showRemove={subtasks.length > 1}
          />
        ))}
      </div>
    </div>
  );
}
