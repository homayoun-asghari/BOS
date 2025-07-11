'use client';

import React, { useEffect, useRef } from 'react';
import { NoteGraphView, NoteGraphModel } from 'note-graph';

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
      referencedBy: note.referencedBy
    }));

    // Create graph model with the notes
    const graphModel = new NoteGraphModel(graphNotes);
    
    // Create graph view with minimal configuration
    const graphView = new NoteGraphView({
      container: containerRef.current,
      graphModel,
      enableNodeDrag: true,
      // Using default styling for now
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
  }, [notes, height]);

  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div 
      ref={containerRef} 
      className={`w-full rounded-lg border bg-card ${className}`} 
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
