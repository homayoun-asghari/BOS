import type { TaskType, MilestoneType } from './roadmap-visualization';

interface TimelineNode {
  type: 'roadmapStart' | 'task' | 'milestoneStart' | 'milestoneEnd' | 'roadmapEnd';
  date: Date;
  task?: TaskType;
  milestone?: MilestoneType;
}

interface RoadmapTimelineProps {
  startDate: Date;
  endDate: Date;
  milestones: MilestoneType[];
  onTaskStatusChange?: (taskId: string, status: TaskType['status']) => Promise<boolean>;
}

export function RoadmapTimeline({ 
  startDate, 
  endDate, 
  milestones,
  onTaskStatusChange 
}: RoadmapTimelineProps) {
  // Sort milestones by order_index or start_date
  const sortedMilestones = [...milestones].sort((a, b) => {
    return (a.order_index || 0) - (b.order_index || 0) || 
           (a.start_date || '').localeCompare(b.start_date || '');
  });

  // Build timeline nodes
  const timelineNodes: TimelineNode[] = [
    { type: 'roadmapStart', date: startDate },
  ];

  sortedMilestones.forEach((milestone) => {
    const milestoneStartDate = milestone.start_date 
      ? new Date(milestone.start_date)
      : new Date(startDate);
      
    const milestoneEndDate = milestone.end_date 
      ? new Date(milestone.end_date)
      : new Date(milestoneStartDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Default to 1 week
    
    timelineNodes.push({
      type: 'milestoneStart',
      milestone,
      date: milestoneStartDate,
    });

    milestone.tasks?.forEach((task: TaskType) => {
      const taskDate = task.due_date 
        ? new Date(task.due_date)
        : new Date(milestoneStartDate);
      
      timelineNodes.push({
        type: 'task',
        task,
        date: taskDate,
      });
    });

    timelineNodes.push({
      type: 'milestoneEnd',
      date: milestoneEndDate,
    });
  });

  timelineNodes.push({
    type: 'roadmapEnd',
    date: endDate,
  });

  // Calculate vertical positions for all nodes
  const timelineHeight = Math.max(900, 120 * (timelineNodes.length - 1) + 80);
  const startY = 60;
  const endY = timelineHeight - 60;
  const nodeCount = timelineNodes.length;

  const getNodeY = (idx: number) => {
    if (nodeCount === 1) return startY;
    return startY + ((endY - startY) * idx) / (nodeCount - 1);
  };

  return (
    <div className="w-full overflow-x-auto py-4">
      <div className="flex justify-center w-full">
        <div className="w-[320px]" style={{ height: timelineHeight }}>
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 320 ${timelineHeight}`} 
            className="block"
          >
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#d1d5db" />
                <stop offset="100%" stopColor="#d1d5db" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            
            {/* Main path with gradient and glow */}
            <path
              d={(() => {
                let d = '';
                const baseCurve = 48;
                for (let i = 0; i < timelineNodes.length - 1; i++) {
                  const y1 = getNodeY(i);
                  const y2 = getNodeY(i + 1);
                  const x1 = 160;
                  const x2 = 160;
                  const isEven = i % 2 === 0;
                  
                  // Add some organic variation to the curve
                  const segmentHeight = Math.abs(y2 - y1);
                  const variation = Math.min(15, segmentHeight * 0.2);
                  const randomOffset1 = (Math.random() - 0.5) * variation;
                  const randomOffset2 = (Math.random() - 0.5) * variation;
                  
                  // Control points with organic variation
                  const midY1 = y1 + (y2 - y1) / 3 + randomOffset1;
                  const midY2 = y1 + 2 * (y2 - y1) / 3 + randomOffset2;
                  
                  // Vary the curve width slightly for organic feel
                  const curve = baseCurve * (0.8 + Math.random() * 0.4);
                  const c1x = x1 + (isEven ? curve : -curve);
                  const c2x = x2 + (isEven ? curve : -curve);
                  
                  if (i === 0) {
                    d += `M${x1},${y1} `;
                  }
                  d += `C${c1x},${midY1} ${c2x},${midY2} ${x2},${y2} `;
                }
                return d;
              })()}
              fill="none"
              stroke="url(#pathGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
              style={{
                transition: 'all 0.3s ease',
                opacity: 0.9,
                strokeDasharray: '0.1, 4',
                strokeDashoffset: 0,
                animation: 'dash 30s linear infinite'
              }}
            />
            
            <style jsx>{`
              @keyframes dash {
                to {
                  stroke-dashoffset: 1000;
                }
              }
            `}</style>
            
            {/* Timeline nodes */}
            {timelineNodes.map((node, idx) => {
              const y = getNodeY(idx);
              
              if (node.type === 'roadmapStart') {
                return (
                  <g key={`${node.type}-${idx}`}>
                    <circle
                      cx="160"
                      cy={y}
                      r="16"
                      fill="#fff"
                      stroke="#d1d5db"
                      strokeWidth="4"
                    />
                    <text x="190" y={y + 5} fontSize="12" fill="#888">
                      {node.date.toLocaleDateString()}
                    </text>
                  </g>
                );
              }
              
              if (node.type === 'roadmapEnd') {
                return (
                  <g key={`${node.type}-${idx}`}>
                    <circle
                      cx="160"
                      cy={y}
                      r="16"
                      fill="#111827"
                      stroke="#d1d5db"
                      strokeWidth="4"
                    />
                    <text x="190" y={y + 5} fontSize="12" fill="#888">
                      {node.date.toLocaleDateString()}
                    </text>
                  </g>
                );
              }
              
              if (node.type === 'milestoneStart') {
                return (
                  <g key={`milestone-${node.milestone?.id}-start`}>
                    <rect
                      x={160 - 12}
                      y={y - 12}
                      width="24"
                      height="24"
                      fill="#fff"
                      stroke="#d1d5db"
                      strokeWidth="3"
                      rx="3"
                    />
                    <text x={190} y={y + 5} fontSize="11" fill="#888">
                      {node.date.toLocaleDateString()}
                    </text>
                  </g>
                );
              }
              
              if (node.type === 'milestoneEnd') {
                return (
                  <g key={`milestone-${idx}-end`}>
                    <rect
                      x={160 - 12}
                      y={y - 12}
                      width="24"
                      height="24"
                      fill="#111827"
                      stroke="#d1d5db"
                      strokeWidth="3"
                      rx="3"
                    />
                  </g>
                );
              }
              
              if (node.type === 'task' && node.task) {
                const { task } = node;
                return (
                  <g key={`task-${task.id}`}>
                    <polygon
                      points={`160,${y - 8} 168,${y} 160,${y + 8} 152,${y}`}
                      fill={task.status === 'completed' ? '#10b981' : '#fff'}
                      stroke={task.status === 'completed' ? '#10b981' : '#d1d5db'}
                      strokeWidth="2"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        if (onTaskStatusChange) {
                          const newStatus = task.status === 'completed' ? 'todo' : 'completed';
                          onTaskStatusChange(task.id, newStatus);
                        }
                      }}
                    />
                    <text x="180" y={y + 5} fontSize="10" fill="#666">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                    </text>
                  </g>
                );
              }
              
              return null;
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
