import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface TaskItemProps {
  id: string;
  title: string;
  completed: boolean;
  onTitleChange: (id: string, title: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onRemove: (id: string) => void;
  showRemove: boolean;
}

export function TaskItem({
  id,
  title,
  completed,
  onTitleChange,
  onToggleComplete,
  onRemove,
  showRemove
}: TaskItemProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={completed}
        onChange={(e) => onToggleComplete(id, e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
      />
      <Textarea
        value={title}
        onChange={(e) => onTitleChange(id, e.target.value)}
        placeholder="Task description"
        className="flex-1 min-h-0 h-auto py-1.5 resize-none"
      />
      {showRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={() => onRemove(id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
