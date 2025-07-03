import { BaseNode } from './BaseNode';
import type { MilestoneType } from '../roadmap-visualization';

interface MilestoneStartNodeProps {
  y: number;
  date: Date;
  milestone?: MilestoneType; // Marked as optional since it's not used
}

export function MilestoneStartNode({ y, date }: MilestoneStartNodeProps) {
  return (
    <BaseNode x={160} y={y} date={date}>
      <rect
        x={160 - 12}
        y={y - 12}
        width="24"
        height="24"
        fill="#fff"
        stroke="#d1d5db"
        strokeWidth="3"
        rx="3"
        className="transition-colors duration-200"
      />
    </BaseNode>
  );
}
