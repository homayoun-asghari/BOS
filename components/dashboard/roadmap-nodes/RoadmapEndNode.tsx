import { BaseNode } from './BaseNode';

interface RoadmapEndNodeProps {
  y: number;
  date: Date;
}

export function RoadmapEndNode({ y, date }: RoadmapEndNodeProps) {
  return (
    <BaseNode x={160} y={y} date={date}>
      <circle
        cx="160"
        cy={y}
        r="16"
        fill="#111827"
        stroke="#d1d5db"
        strokeWidth="4"
        className="transition-colors duration-200"
      />
    </BaseNode>
  );
}
