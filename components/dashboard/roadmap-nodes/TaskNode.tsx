import type { TaskType } from '../roadmap-visualization';

interface TaskNodeProps {
  y: number;
  task: TaskType;
  onStatusChange?: (taskId: string, status: TaskType['status']) => void;
}

export function TaskNode({ y, task, onStatusChange }: TaskNodeProps) {
  const handleClick = () => {
    if (onStatusChange) {
      const newStatus = task.status === 'completed' ? 'todo' : 'completed';
      onStatusChange(task.id, newStatus);
    }
  };

  return (
    <g>
      <polygon
        points={`160,${y - 8} 168,${y} 160,${y + 8} 152,${y}`}
        fill={task.status === 'completed' ? '#10b981' : '#fff'}
        stroke={task.status === 'completed' ? '#10b981' : '#d1d5db'}
        strokeWidth="2"
        style={{ cursor: 'pointer' }}
        onClick={handleClick}
        className="transition-colors duration-200"
      />
      <text x="180" y={y + 5} fontSize="10" fill="#666" className="text-xs">
        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
      </text>
    </g>
  );
}
