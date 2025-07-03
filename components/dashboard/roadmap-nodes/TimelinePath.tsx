import React from 'react';

interface TimelinePathProps {
  nodeCount: number;
  startY: number;
  endY: number;
  width?: number;
}

export function TimelinePath({ 
  nodeCount, 
  startY, 
  endY,
  width = 320,
}: TimelinePathProps) {
  const getNodeY = (idx: number) => {
    if (nodeCount === 1) return startY;
    return startY + ((endY - startY) * idx) / (nodeCount - 1);
  };

  const generatePathData = () => {
    let d = '';
    const baseCurve = 48;
    
    for (let i = 0; i < nodeCount - 1; i++) {
      const y1 = getNodeY(i);
      const y2 = getNodeY(i + 1);
      const x1 = width / 2;
      const x2 = width / 2;
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
  };

  return (
    <>
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
      
      <path
        d={generatePathData()}
        fill="none"
        stroke="url(#pathGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
        className="timeline-path"
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
        .timeline-path {
          vector-effect: non-scaling-stroke;
        }
      `}</style>
    </>
  );
}
