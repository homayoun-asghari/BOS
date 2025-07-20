import { Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TaskItemProps {
  id: string;
  title: string;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
  onTitleChange: (id: string, title: string) => void;
  onDueDateChange: (id: string, date?: Date) => void;
  onPriorityChange: (id: string, priority: 'low' | 'medium' | 'high') => void;
  onRemove: (id: string) => void;
  showRemove: boolean;
}

const priorityColors = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

export function TaskItem({
  id,
  title,
  dueDate,
  priority = 'medium',
  onTitleChange,
  onDueDateChange,
  onPriorityChange,
  onRemove,
  showRemove
}: TaskItemProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
      <div className="flex-1 w-full sm:w-auto">
        <Input
          value={title}
          onChange={(e) => onTitleChange(id, e.target.value)}
          placeholder="Task description *"
          className="h-9 w-full"
        />
      </div>
      
      <div className="w-full sm:w-auto flex items-center gap-2">
        <div className="w-[140px]">
          <DatePicker
            date={dueDate}
            onSelect={(date) => onDueDateChange(id, date)}
            placeholder="Due date"
            className="[&_button]:h-8 [&_button]:text-xs [&_button]:w-full [&_button]:justify-start [&_button]:px-2"
            dateFormat="MMM d, yyyy"
            label=""
          />
        </div>

        <div className="w-[120px]">
          <Select 
            value={priority} 
            onValueChange={(value: 'low' | 'medium' | 'high') => onPriorityChange(id, value)}
          >
            <SelectTrigger className="h-8 w-full text-xs px-2 [&>svg]:hidden">
              <div className="flex items-center w-full justify-between">
                <div className="flex items-center min-w-0">
                  <span className={`inline-block w-2 h-2 rounded-full ${priorityColors[priority]} flex-shrink-0 mr-2`}></span>
                  <span className="truncate">
                    <SelectValue placeholder="Priority" />
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0 ml-1" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high" className="text-sm pl-8">
                High
              </SelectItem>
              <SelectItem value="medium" className="text-sm pl-8">
                Medium
              </SelectItem>
              <SelectItem value="low" className="text-sm pl-8">
                Low
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive flex-shrink-0"
            onClick={() => onRemove(id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
