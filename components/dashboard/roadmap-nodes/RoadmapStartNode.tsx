import { BaseNode } from './BaseNode';

interface RoadmapStartNodeProps {
  y: number;
  date: Date;
}

export function RoadmapStartNode({ y, date }: RoadmapStartNodeProps) {
  return (
    <BaseNode x={160} y={y} date={date}>
      <circle
        cx="160"
        cy={y}
        r="16"
        fill="#fff"
        stroke="#d1d5db"
        strokeWidth="4"
        className="transition-colors duration-200"
      />
    </BaseNode>
  );
}
