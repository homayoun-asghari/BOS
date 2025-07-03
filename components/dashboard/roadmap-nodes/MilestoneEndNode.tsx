import { BaseNode } from './BaseNode';

interface MilestoneEndNodeProps {
  y: number;
}

export function MilestoneEndNode({ y }: MilestoneEndNodeProps) {
  return (
    <BaseNode x={160} y={y}>
      <rect
        x={160 - 12}
        y={y - 12}
        width="24"
        height="24"
        fill="#111827"
        stroke="#d1d5db"
        strokeWidth="3"
        rx="3"
        className="transition-colors duration-200"
      />
    </BaseNode>
  );
}
