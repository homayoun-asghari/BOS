"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { TimelineOverlay } from '@/components/posts/display/TimelineOverlay';

interface TextPostProps {
  text: string;
  onChange: (text: string) => void;
  isMaxLength: boolean;
  category: 'roadmap' | 'milestone' | 'task';
  user: { name: string; avatarUrl?: string };
  timestamp: string | Date;
  currentRoadmap: { id: string; title: string };
  currentMilestone: { id: string; title: string };
  currentTask: { id: string; title: string };
}

export function TextPost({
  text,
  onChange,
  isMaxLength,
  user,
  timestamp,
  currentRoadmap,
  currentMilestone,
  currentTask
}: Omit<TextPostProps, 'category'>) {
  const [fontSize, setFontSize] = useState(48);
  const [isMaxHeight, setIsMaxHeight] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const TEXT_ZONE_PADDING_TOP = 200;
  const MIN_FONT_SIZE = 16;
  const MAX_FONT_SIZE = 48;

  const calculateFontSize = useCallback((text: string) => {
    const lineHeight = 1.2;
    const paddingX = 32;
    const availableHeight =
      wrapperRef.current?.clientHeight
        ? wrapperRef.current.clientHeight - TEXT_ZONE_PADDING_TOP - 20
        : 0;
    const availableWidth =
      wrapperRef.current?.clientWidth
        ? wrapperRef.current.clientWidth - paddingX * 2
        : 0;

    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return { size: MAX_FONT_SIZE, isMaxLength: false };

    const calc = (size: number) => {
      ctx.font = `${size}px system-ui, sans-serif`;
      const words = text.split(/\s+/);
      let line = '';
      let lines = 1;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        const { width } = ctx.measureText(test);
        if (width > availableWidth && line) {
          line = word;
          lines++;
        } else {
          line = test;
        }
      }
      return {
        lines,
        fits: lines * size * lineHeight <= availableHeight
      };
    };

    if (calc(MAX_FONT_SIZE).fits) return { size: MAX_FONT_SIZE, isMaxLength: false };

    let low = MIN_FONT_SIZE, high = MAX_FONT_SIZE, best = MIN_FONT_SIZE;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const { fits } = calc(mid);
      if (fits) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const { fits } = calc(best);
    return {
      size: best,
      isMaxLength: !fits || best <= MIN_FONT_SIZE
    };
  }, []);

  useEffect(() => {
    if (!textareaRef.current) return;

    const { size, isMaxLength: tooLong } = calculateFontSize(text);
    setFontSize(size);

    textareaRef.current.style.height = 'auto';
    const scrollHeight = textareaRef.current.scrollHeight;
    const maxHeight =
      wrapperRef.current?.clientHeight
        ? wrapperRef.current.clientHeight - TEXT_ZONE_PADDING_TOP - 20
        : 0;

    // Only prevent typing if we're at min font size AND exceeding max height
    const shouldLimit = size <= MIN_FONT_SIZE && scrollHeight > maxHeight;
    setIsMaxHeight(shouldLimit);
    
    // Only auto-trim if we're adding new text while limited
    if (shouldLimit && text.length > 0 && text.length === textareaRef.current.value.length) {
      onChange(text.slice(0, -1));
      return;
    }
    
    textareaRef.current.style.height = `${scrollHeight}px`;
  }, [text, calculateFontSize, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Always allow changes that reduce text length
    if (e.target.value.length < text.length) {
      onChange(e.target.value);
      return;
    }
    
    // For text additions, check if we're at max capacity
    if (isMaxHeight || isMaxLength) {
      return;
    }
    
    onChange(e.target.value);
  };

  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-full max-h-[90vh] aspect-[9/16] mx-auto rounded-2xl bg-background overflow-hidden"
    >
      {/* Top Overlay (fixed at top, never scrolls) */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <TimelineOverlay
          user={user}
          timestamp={timestamp}
          currentRoadmap={currentRoadmap}
          currentMilestone={currentMilestone}
          currentTask={currentTask}
        />
      </div>

      {/* Text typing zone */}
      <div
        className="relative w-full h-full flex justify-center items-start overflow-hidden px-4"
        style={{ paddingTop: `${TEXT_ZONE_PADDING_TOP}px`, paddingBottom: '20px' }}
      >
        <div className="w-full max-w-full relative">
          {(isMaxLength || isMaxHeight) && (
            <div className="absolute top-0 right-0 bg-foreground/90 text-background text-xs px-2 py-1 rounded z-10">
              Max length reached
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            placeholder="Start typing..."
            className="w-full bg-transparent border-none outline-none resize-none text-center placeholder-foreground/70 font-bold"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: '1.2',
              color: 'hsl(var(--foreground))',
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
              padding: 0,
              margin: 0,
              overflow: 'hidden',
              minHeight: '1.2em',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word'
            }}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
