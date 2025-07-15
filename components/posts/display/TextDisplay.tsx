"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useLikeAnimation } from '@/hooks/useLikeAnimation';
import { ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TimelineOverlay } from "./TimelineOverlay";
import { PostDisplayProps } from "./PostDisplayProps";

interface TextDisplayProps extends PostDisplayProps {
  content: string;
}

export function TextDisplay({
  id,
  content,
  timestamp,
  user,
  currentRoadmap,
  currentMilestone,
  currentTask,
  likes,
  onLike,
  className
}: TextDisplayProps) {
  const [fontSize, setFontSize] = useState(48);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAnimating, triggerLikeAnimation } = useLikeAnimation();

  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width,
          height: rect.height
        });
      }
    };

    // Initial update
    updateContainerSize();

    // Update on window resize
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const calculateFontSize = (text: string) => {
      const minFontSize = 12;  // Reduced minimum for small screens
      const maxFontSize = 48;  // Maximum for large screens
      const maxLines = 20;
      const lineHeight = 1.2;
      const containerPadding = 32; // 16px padding on each side
      
      if (!text.trim()) return maxFontSize;
      
      const calculateLines = (fontSize: number) => {
        const words = text.split(/\s+/);
        const containerWidth = containerSize.width - containerPadding;
        const containerHeight = containerSize.height - containerPadding;
        const context = document.createElement('canvas').getContext('2d');
        let currentLine = '';
        let lines = 1;
        
        if (!context) return { lines: 1, fits: true };
          
        context.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const metrics = context.measureText(testLine);
            
          if (metrics.width > containerWidth && currentLine) {
            currentLine = word;
            lines++;
            
            if (lines > maxLines || (lines * fontSize * lineHeight) > containerHeight) {
              return { lines, fits: false };
            }
          } else {
            currentLine = testLine;
          }
        }
          
        return { lines, fits: true };
      };

      // Adjust font size based on container size
      const baseFontSize = Math.min(
        containerSize.width / 10, // Width-based scaling
        containerSize.height / 15, // Height-based scaling
        maxFontSize
      );

      const maxSizeCheck = calculateLines(baseFontSize);
      if (maxSizeCheck.fits) {
        return baseFontSize;
      }

      // If base size doesn't fit, use binary search to find best fit
      let low = minFontSize;
      let high = baseFontSize;
      let bestFit = minFontSize;
      
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const { fits } = calculateLines(mid);
          
        if (fits) {
          bestFit = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      
      return bestFit;
    };

    const newSize = calculateFontSize(content);
    setFontSize(newSize);
  }, [content, containerSize]);

  return (
    <div className={cn("relative w-full rounded-2xl", className)}
      style={{
        aspectRatio: '9/16',
        position: 'relative'
      }}>
      {/* Timeline Overlay */}
      <TimelineOverlay
        user={user}
        timestamp={timestamp}
        currentRoadmap={currentRoadmap}
        currentMilestone={currentMilestone}
        currentTask={currentTask}
      />

      {/* Content Container */}
      <div 
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center p-4 sm:p-8 overflow-hidden"
      >
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-full max-w-full relative">
            <div 
              className="w-full bg-transparent border-none outline-none resize-none text-center text-foreground font-bold leading-normal placeholder-foreground/70 transition-all duration-300 ease-out"
              style={{
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                fontSize: `${fontSize}px`,
                lineHeight: '1.2',
                transform: 'translateY(0)',
                overflow: 'hidden',
                position: 'relative',
                maxWidth: '100%',
                wordBreak: 'break-word'
              }}
            >
              {content}
            </div>
          </div>
        </div>
      </div>

      {/* Like Button */}
      <div className="absolute bottom-4 left-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={(e) => {
            onLike?.(id);
            triggerLikeAnimation();
          }}
          className="relative bg-black/30 backdrop-blur-sm rounded-full p-2"
        >
          <ThumbsUp 
            className="h-4 w-4 transition-all duration-300 text-primary"
            style={{
              transform: isAnimating 
                ? 'scale(1.5) rotate(360deg)'
                : 'scale(1) rotate(0deg)',
              opacity: isAnimating ? 0.8 : 1,
              filter: isAnimating 
                ? 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.8))'
                : 'drop-shadow(0 0 0)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </Button>
      </div>

      {/* Likes Count */}
      {likes > 0 && (
        <div className="absolute bottom-4 right-4 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-primary">
          {likes} likes
        </div>
      )}
    </div>
  );
}
