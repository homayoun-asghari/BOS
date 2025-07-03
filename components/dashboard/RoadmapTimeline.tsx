import type { TaskType, MilestoneType } from './roadmap-visualization';
import { 
  RoadmapStartNode, 
  RoadmapEndNode, 
  MilestoneStartNode, 
  MilestoneEndNode, 
  TaskNode,
  TimelinePath
} from './roadmap-nodes';

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
            <TimelinePath 
              nodeCount={timelineNodes.length}
              startY={startY}
              endY={endY}
              width={320}
            />
            
            {/* Timeline nodes */}
            {timelineNodes.map((node, idx) => {
              const y = getNodeY(idx);
              
              if (node.type === 'roadmapStart') {
                return <RoadmapStartNode key="roadmap-start" y={y} date={node.date} />;
              }
              
              if (node.type === 'roadmapEnd') {
                return <RoadmapEndNode key="roadmap-end" y={y} date={node.date} />;
              }
              
              if (node.type === 'milestoneStart' && node.milestone) {
                return (
                  <MilestoneStartNode 
                    key={`milestone-start-${node.milestone.id}`} 
                    y={y} 
                    date={node.date} 
                    milestone={node.milestone} 
                  />
                );
              }
              
              if (node.type === 'milestoneEnd') {
                return <MilestoneEndNode key={`milestone-end-${idx}`} y={y} />;
              }
              
              if (node.type === 'task' && node.task) {
                return (
                  <TaskNode 
                    key={`task-${node.task.id}`} 
                    y={y} 
                    task={node.task} 
                    onStatusChange={onTaskStatusChange}
                  />
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
