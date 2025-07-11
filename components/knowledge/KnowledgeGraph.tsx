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
    const nodeColor = isDark ? 'hsl(0, 0%, 95%)' : 'hsl(var(--primary))';
    const linkColor = isDark ? 'hsla(0, 0%, 100%, 0.7)' : 'hsl(var(--muted-foreground) / 0.5)';
    const linkHighlightedColor = isDark ? 'hsl(0, 0%, 100%)' : 'hsl(var(--primary))';
    const linkLessenedColor = isDark ? 'hsla(0, 0%, 100%, 0.3)' : 'hsl(var(--muted-foreground) / 0.3)';

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
            highlighted: 'hsl(var(--accent))',
            lessened: isDark ? 'hsla(0, 0%, 100%, 0.5)' : 'hsl(var(--muted))'
          }
        },
        // Link styles
        link: {
          regular: linkColor,
          highlighted: linkHighlightedColor,
          lessened: linkLessenedColor
        },
        // Hover styles for node links
        hoverNodeLink: {
          highlightedDirection: {
            inbound: 'hsl(var(--accent))',
            outbound: linkHighlightedColor
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

  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div 
      ref={containerRef} 
      className={`w-full rounded-lg border note-graph-container ${className}`} 
      style={{ 
        height: heightStyle,
        minHeight: heightStyle,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-muted-foreground">Loading graph...</div>
      </div>
    </div>
  );
}
