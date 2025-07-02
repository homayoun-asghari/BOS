import { Calendar as CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
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

      <div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !deadline && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {deadline ? format(deadline, "PPP") : 'Pick a deadline'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-background rounded-md shadow-lg border border-border" align="start">
            <Calendar
              mode="single"
              selected={deadline || undefined}
              onSelect={(date) => onDeadlineChange(id, date || null)}
              initialFocus
              className="bg-background"
              classNames={{
                day_selected: 'bg-primary text-primary-foreground hover:bg-primary/90',
                day_today: 'bg-accent text-accent-foreground',
                day_outside: 'text-muted-foreground opacity-50',
                caption: 'flex justify-center pt-1 relative items-center',
                caption_label: 'text-sm font-medium',
                nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                table: 'w-full border-collapse space-y-1',
                head_row: 'flex',
                head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
                row: 'flex w-full mt-2',
                cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
              }}
            />
          </PopoverContent>
        </Popover>
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
