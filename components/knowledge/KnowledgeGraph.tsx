'use client';

import React, { useEffect, useRef } from 'react';
import { NoteGraphView, NoteGraphModel } from 'note-graph';
import { useTheme } from 'next-themes';

export interface Note {
  id: string;
  title: string;
  linkTo: string[];
  referencedBy: string[];
}

interface KnowledgeGraphProps {
  notes: Note[];
  className?: string;
  height?: number | string;
}

export default function KnowledgeGraph({ 
  notes, 
  className = '', 
  height = 500 
}: KnowledgeGraphProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphViewRef = useRef<NoteGraphView | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    // Clean up previous instance if it exists
    if (graphViewRef.current) {
      graphViewRef.current.dispose();
      graphViewRef.current = null;
    }

    // Process notes to match the expected format
    const graphNotes = notes.map(note => ({
      id: note.id,
      title: note.title,
      linkTo: note.linkTo,
      referencedBy: note.referencedBy,
      // Add custom properties for styling
      isIndex: note.title.toLowerCase().includes('index'),
      isInbox: note.title.toLowerCase() === 'inbox',
      isTodo: note.title.toLowerCase() === 'todo'
    }));

    // Create graph model with the notes
    const graphModel = new NoteGraphModel(graphNotes);
    
    // Theme-aware colors
    const isDark = theme === 'dark';
    
    // Node colors - dynamic based on theme
    const nodeColor = isDark ? 'hsl(0, 0%, 90%)' : 'hsl(0, 0%, 20%)';
    const nodeHighlighted = isDark ? 'hsl(0, 0%, 100%)' : 'hsl(0, 0%, 10%)';
    const nodeLessened = isDark ? 'hsla(0, 0%, 70%, 0.6)' : 'hsla(0, 0%, 30%, 0.6)';
    
    // Link colors - dynamic based on theme
    const linkColor = isDark ? 'hsla(0, 0%, 85%, 0.6)' : 'hsla(0, 0%, 40%, 0.6)';
    const linkHighlighted = isDark ? 'hsl(0, 0%, 100%)' : 'hsl(0, 0%, 10%)';
    const linkLessened = isDark ? 'hsla(0, 0%, 60%, 0.3)' : 'hsla(0, 0%, 60%, 0.2)';

    // Create graph view with theme-aware styling
    const graphView = new NoteGraphView({
      container: containerRef.current,
      graphModel,
      enableNodeDrag: true,
      style: {
        // Set canvas background
        background: 'hsl(var(--background))',
        fontSize: 12,
        // Node styles
        node: {
          note: {
            regular: nodeColor,
            highlighted: nodeHighlighted,
            lessened: nodeLessened
          }
        },
        // Link styles
        link: {
          regular: linkColor,
          highlighted: linkHighlighted,
          lessened: linkLessened
        },
        // Hover styles for node links
        hoverNodeLink: {
          highlightedDirection: {
            inbound: 'hsl(45, 100%, 50%)', // Yellow for both modes
            outbound: 'hsl(45, 100%, 60%)'  // Slightly lighter yellow for outbound
          }
        }
      }
    });

    graphViewRef.current = graphView;

    // Initial resize
    const updateSize = () => {
      if (!containerRef.current) return;
      const { width, height: containerHeight } = containerRef.current.getBoundingClientRect();
      const graphHeight = typeof height === 'number' ? height : containerHeight;
      graphView.updateCanvasSize({ width, height: graphHeight });
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', updateSize);
      if (graphViewRef.current) {
        graphViewRef.current.dispose();
        graphViewRef.current = null;
      }
    };
  }, [notes, height, theme]);

  return (
    <div 
      ref={containerRef} 
      className={className}
      style={{ 
        height: typeof height === 'number' ? `${height}px` : height,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        outline: 'none',
        border: 'none',
        boxShadow: 'none',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-muted-foreground">Loading graph...</div>
      </div>
    </div>
  );
}
