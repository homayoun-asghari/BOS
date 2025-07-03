import { ReactNode } from 'react';

interface BaseNodeProps {
  x: number;
  y: number;
  children: ReactNode;
  date?: Date;
  label?: string;
}

export function BaseNode({ x, y, children, date, label }: BaseNodeProps) {
  return (
    <g>
      {children}
      {date && (
        <text 
          x={x + 30} 
          y={y + 5} 
          fontSize="12" 
          fill="#888" 
          className="text-xs"
        >
          {date.toLocaleDateString()}
        </text>
      )}
      {label && (
        <text 
          x={x + 30} 
          y={y + 5} 
          fontSize="12" 
          fill="#888" 
          className="text-xs"
        >
          {label}
        </text>
      )}
    </g>
  );
}
