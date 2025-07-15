"use client";

import { useState, useCallback, useEffect, useRef } from 'react';

interface TextPostProps {
  text: string;
  onChange: (text: string) => void;
  isMaxLength: boolean;
  category: 'roadmap' | 'milestone' | 'task';
}

export function TextPost({ text, onChange, isMaxLength, category }: TextPostProps) {
  const [fontSize, setFontSize] = useState(48);
  const [isMaxHeight, setIsMaxHeight] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const checkMaxHeight = useCallback((element: HTMLTextAreaElement) => {
    if (!containerRef.current) return false;
    const containerHeight = containerRef.current.clientHeight;
    const contentHeight = element.scrollHeight;
    return contentHeight > containerHeight;
  }, []);

  const calculateFontSize = useCallback((text: string) => {
    const minFontSize = 16;
    const maxFontSize = 48;
    const maxLines = 20;
    const lineHeight = 1.2;
    
    if (!text.trim()) return { size: maxFontSize, isMaxLength: false };
    
    const calculateLines = (fontSize: number) => {
      const words = text.split(/\s+/);
      const containerWidth = 300;
      const containerHeight = 600;
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
    
    const maxSizeCheck = calculateLines(maxFontSize);
    if (maxSizeCheck.fits) {
      return { size: maxFontSize, isMaxLength: false };
    }
    
    let low = minFontSize;
    let high = maxFontSize;
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
    
    const finalCheck = calculateLines(bestFit);
    return { 
      size: bestFit, 
      isMaxLength: !finalCheck.fits || bestFit <= minFontSize 
    };
  }, []);

  useEffect(() => {
    if (textareaRef.current && containerRef.current) {
      const { size: newSize } = calculateFontSize(text);
      setFontSize(newSize);
      
      textareaRef.current.style.height = 'auto';
      
      const atMinSize = newSize <= 16; 
      const exceedsHeight = checkMaxHeight(textareaRef.current);
      
      if (atMinSize && exceedsHeight) {
        setIsMaxHeight(true);
        if (text.length > 0) {
          const newText = text.slice(0, -1);
          setTimeout(() => {
            onChange(newText);
          }, 0);
          return;
        }
      } else {
        setIsMaxHeight(false);
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }
  }, [text, calculateFontSize, checkMaxHeight, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isMaxLength || isMaxHeight) return;
    onChange(e.target.value);
  };

  const categoryStyles = {
    roadmap: 'border-blue-500',
    milestone: 'border-green-500',
    task: 'border-purple-500',
  };

  const categoryIcons = {
    roadmap: '🗺️',
    milestone: '🎯',
    task: '✅',
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full max-h-[90vh] aspect-[9/16] mx-auto bg-black/50 backdrop-blur-md rounded-2xl overflow-hidden"
    >
      <div className="absolute inset-0 flex items-center justify-center p-8 overflow-hidden">
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-full max-w-full">
            {(isMaxLength || isMaxHeight) && (
              <div className="absolute top-2 right-2 bg-black/50 text-white/80 text-xs px-2 py-1 rounded">
                Max length reached
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              placeholder={isMaxLength ? 'Character limit reached' : 'Start typing...'}
              className={`w-full bg-transparent border-none outline-none resize-none text-center text-white font-bold leading-normal placeholder-white/70 transition-all duration-300 ease-out ${isMaxLength ? 'opacity-70' : ''}`}
              style={{
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                padding: '1rem',
                boxSizing: 'border-box',
                minHeight: '100%',
                fontSize: `${fontSize}px`,
                lineHeight: '1.2',
                transform: 'translateY(0)',
                overflow: 'hidden',
                position: 'relative',
                top: '50%',
                transformOrigin: 'center center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
                resize: 'none',
              }}
              autoFocus
            />
          </div>
        </div>
      </div>
    </div>
  );
}
