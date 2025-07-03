import React from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Handle and Position are crucial here

// Define the Task interface (can be moved to a shared types file if preferred)
interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  milestone_id: string;
  order_index: number;
  due_date?: string | null;
  priority?: 'low' | 'medium' | 'high';
}

// Define the data interface for our custom node
interface CustomTaskNodeData {
  task: Task;
  onTaskStatusChange: (taskId: string, currentStatus: string) => void;
}

// Custom Task Node Component
const CustomTaskNode: React.FC<NodeProps<CustomTaskNodeData>> = ({ data }) => {
  const { task, onTaskStatusChange } = data;

  const handleCheckboxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Stop the event from propagating up to the ReactFlow node handler
    e.stopPropagation();
    
    // Toggle between 'done' and 'todo' based on the checkbox's new checked state
    const newStatus = e.target.checked ? 'done' : 'todo';
    console.log('Checkbox changed:', { taskId: task.id, currentStatus: task.status, newStatus });
    
    try {
      // Call the parent's onTaskStatusChange with the new status
      await onTaskStatusChange(task.id, newStatus);
      // Note: We don't need to update local state here as the parent component
      // will handle the state update through props
    } catch (error) {
      console.error('Error updating task status:', error);
      // The parent component will handle reverting the UI state if the update fails
    }
  };

  // Get styles based on priority and completion status
  const getTaskStyles = () => {
    if (task.status === 'done') {
      return {
        container: 'border-border bg-muted/50',
        text: 'text-muted-foreground',
        checkbox: 'border-foreground/30 text-foreground/50',
      };
    }

    switch (task.priority) {
      case 'high':
        return {
          container: 'border-red-500 dark:border-red-600 bg-background',
          text: 'text-foreground',
          checkbox: 'border-red-500 dark:border-red-600 text-red-600 dark:text-red-500',
        };
      case 'medium':
        return {
          container: 'border-amber-500 dark:border-amber-600 bg-background',
          text: 'text-foreground',
          checkbox: 'border-amber-500 dark:border-amber-600 text-amber-600 dark:text-amber-500',
        };
      case 'low':
        return {
          container: 'border-green-500 dark:border-green-600 bg-background',
          text: 'text-foreground',
          checkbox: 'border-green-500 dark:border-green-600 text-green-600 dark:text-green-500',
        };
      default:
        return {
          container: 'border-border bg-background',
          text: 'text-foreground',
          checkbox: 'border-foreground/30',
        };
    }
  };

  const { container, text, checkbox } = getTaskStyles();

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md shadow-sm border-2 ${container}`}
      style={{
        width: '240px',
        pointerEvents: 'auto',
        cursor: 'default',
      }}
    >
      {/* Target Handle: Where edges can connect TO this task node */}
      {/* Positioned on the left side, as the edge from the milestone (or previous task) will come from there */}
      <Handle type="target" position={Position.Left} />

      <input
        type="checkbox"
        checked={task.status === 'done'}
        onChange={handleCheckboxChange}
        className={`h-4 w-4 flex-shrink-0 cursor-pointer border rounded ${checkbox}`}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${text} truncate`}>{task.title}</p>
        {task.due_date && (
          <p className={`text-xs ${text} opacity-70`}>
            Due: {new Date(task.due_date).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric'
            })}
          </p>
        )}
      </div>

      {/* Source Handle: Where edges can connect FROM this task node */}
      {/* Positioned on the right side, as the edge to the next task will go from here */}
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default CustomTaskNode;