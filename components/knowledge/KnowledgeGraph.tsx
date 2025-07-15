'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NoteGraphView, NoteGraphModel } from 'note-graph';

import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/auth/AuthProvider';
import { fetchKnowledgeGraphData } from '@/lib/supabase/services/knowledgeGraph';

// Simple loading skeleton component
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-muted animate-pulse rounded-md ${className}`} />
);

type Note = {
  id: string;
  title: string;
  linkTo: string[];
  referencedBy: string[];
  tags?: Array<{ id: string; name: string }>;
  content_search?: string;
};

interface KnowledgeGraphProps {
  height?: number | string;
  className?: string;
  search?: string;
  tags?: string[];
}

export default function KnowledgeGraph({ 
  height = '100%',
  className = '',
  search,
  tags
}: KnowledgeGraphProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphViewRef = useRef<NoteGraphView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<Note[]>([]);
  
  // Handle node click
  const handleNodeClick = useCallback((nodeId: string) => {
    router.push(`/notes/${nodeId}`);
  }, [router]);
  
  // Memoize the graph notes to prevent unnecessary recalculations
  const graphNotes = React.useMemo(() => {
    if (isLoading || error || graphData.length === 0) {
      console.log('No graph data available yet:', { isLoading, error, graphData });
      return [];
    }

    // First, find all notes that match the search/tags
    const matchedNoteIds = new Set<string>();
    
    // Get all notes that match the search/tags
    const matchedNotes = graphData.filter(note => {
      let matches = true;
      
      // Filter by tags
      if (tags?.length) {
        const noteTagNames = (note.tags || []).map(t => t.name.toLowerCase());
        const searchTags = tags.map(t => t.trim().toLowerCase());
        console.log('Filtering by tags:', { 
          noteId: note.id, 
          noteTags: noteTagNames, 
          searchTags,
          matchesAll: searchTags.every(tag => noteTagNames.includes(tag))
        });
        matches = searchTags.every(tag => noteTagNames.includes(tag));
      }
      
      // Filter by search text
      if (matches && search) {
        const searchText = search.toLowerCase();
        const titleMatch = note.title.toLowerCase().includes(searchText);
        const contentMatch = note.content_search?.toLowerCase().includes(searchText) || false;
        matches = titleMatch || contentMatch;
      }
      
      if (matches) {
        matchedNoteIds.add(note.id);
      }
      
      return matches;
    });

    // Now find all linked notes that aren't in the matched set
    const linkedNoteIds = new Set<string>();
    
    // For each matched note, find all linked notes
    matchedNotes.forEach(note => {
      note.linkTo?.forEach(linkedId => {
        if (!matchedNoteIds.has(linkedId)) {
          linkedNoteIds.add(linkedId);
        }
      });
      
      note.referencedBy?.forEach(linkedId => {
        if (!matchedNoteIds.has(linkedId)) {
          linkedNoteIds.add(linkedId);
        }
      });
    });

    // Get the actual linked notes data
    const linkedNotes = graphData.filter(note => linkedNoteIds.has(note.id));
    
    // Combine matched and linked notes
    const allNotesToShow = [...matchedNotes, ...linkedNotes];
    
    const notes = allNotesToShow.map(note => ({
      id: note.id,
      title: note.title,
      linkTo: note.linkTo || [],
      referencedBy: note.referencedBy || [],
      // Add custom properties for styling
      isIndex: note.title.toLowerCase().includes('index'),
      isInbox: note.title.toLowerCase() === 'inbox',
      isTodo: note.title.toLowerCase() === 'todo',
      // Add search match status for highlighting
      isSearchMatch: matchedNoteIds.has(note.id)
    }));
    
    console.log('Graph notes with links:', notes);
    return notes;
  }, [graphData, isLoading, error, search, tags]);
  
  // Memoize the graph style to prevent unnecessary recalculations
  const graphStyle = React.useMemo(() => {
    const isDark = theme === 'dark';
    
    // Node colors - dynamic based on theme
    const nodeColor = isDark ? 'hsl(0, 0%, 90%)' : 'hsl(0, 0%, 20%)';
    const nodeHighlighted = isDark ? 'hsl(0, 0%, 100%)' : 'hsl(0, 0%, 10%)';
    const nodeLessened = isDark ? 'hsla(0, 0%, 70%, 0.6)' : 'hsla(0, 0%, 30%, 0.6)';
    
    // Link colors - dynamic based on theme
    const linkColor = isDark ? 'hsla(0, 0%, 85%, 0.6)' : 'hsla(0, 0%, 40%, 0.6)';
    const linkHighlighted = isDark ? 'hsl(0, 0%, 100%)' : 'hsl(0, 0%, 10%)';
    const linkLessened = isDark ? 'hsla(0, 0%, 60%, 0.3)' : 'hsla(0, 0%, 60%, 0.2)';
    
    return {
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
    };
  }, [theme]);

  // Create and initialize the graph model
  useEffect(() => {
    if (!graphViewRef.current || !containerRef.current) return;

    const graphModel = new NoteGraphModel();
    
    // Create a Set of existing node IDs for quick lookup
    const existingNodeIds = new Set(graphNotes.map(note => note.id));
    
    // Set up initial nodes and links
    graphNotes.forEach(note => {
      graphModel.addNode(note.id, {
        label: note.title,
        color: 'hsl(0, 0%, 90%)',
        size: 15,
        labelColor: 'hsl(0, 0%, 10%)'
      });
      
      // Only add links where both source and target nodes exist in the filtered set
      note.linkTo.forEach(targetId => {
        if (existingNodeIds.has(targetId)) {
          graphModel.addLink(note.id, targetId);
        }
      });
    });

    // Highlight nodes that match the search
    graphNotes.forEach(note => {
      if (note.isSearchMatch) {
        // Highlight matching nodes
        graphModel.updateNode(note.id, {
          color: 'hsl(210, 70%, 60%)',
          size: 20,
          labelColor: 'hsl(0, 0%, 100%)'
        });
      }
    });

    // Configure layout and physics
    graphModel.configure({
      layout: {
        gravity: 0.1,
        repulsion: 100,
        damping: 0.9,
        stiffness: 0.1,
        nodeOverlap: 1.5,
        linkOverlap: 0.5,
        bounds: {
          left: 0,
          top: 0,
          right: containerRef.current.clientWidth,
          bottom: containerRef.current.clientHeight
        }
      },
      physics: {
        enabled: true,
        springLength: 100,
        springStiffness: 0.001,
        damping: 0.01,
        gravity: -0.01
      }
    });

    // Set up the graph view
    graphViewRef.current = new NoteGraphView({
      container: containerRef.current,
      model: graphModel,
      style: graphStyle
    });

    // Handle node click
    graphViewRef.current.onInteraction('nodeClick', ({ node }) => {
      handleNodeClick(node.id);
    });

    return () => {
      graphViewRef.current?.dispose();
    };
  }, [graphNotes, search, graphStyle]);

  // Load data on initial mount
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        if (!user?.id) {
          console.log('User not authenticated, skipping graph data load');
          return;
        }
        const data = await fetchKnowledgeGraphData(user.id);
        if (isMounted) {
          setGraphData(data);
        }
      } catch (err) {
        console.error('Failed to load knowledge graph data:', err);
        if (isMounted) {
          setError('Failed to load knowledge graph. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading || error || !containerRef.current || graphNotes.length === 0) {
      return;
    }
    
    // Clean up previous instance if it exists
    if (graphViewRef.current) {
      graphViewRef.current.dispose();
      graphViewRef.current = null;
    }

    // Create graph model with the notes
    const graphModel = new NoteGraphModel(graphNotes);
    
    // Create graph view with the memoized style
    const graphView = new NoteGraphView({
      container: containerRef.current,
      graphModel,
      enableNodeDrag: true,
      style: graphStyle
    });

    // Set up node click handler using the library's built-in event system
    graphView.onInteraction('nodeClick', ({ node }: { node: { id: string } }) => {
      console.log('Node clicked (via interaction):', node);
      if (node && node.id) {
        handleNodeClick(node.id);
      }
    });

    // Set cursor to pointer to indicate clickable nodes
    const canvas = containerRef.current?.querySelector('canvas');
    if (canvas) {
      canvas.style.cursor = 'pointer';
    }
    
    graphViewRef.current = graphView;
    
    // Initial resize
    const updateSize = () => {
      if (!containerRef.current || !graphViewRef.current) return;
      const { width, height: containerHeight } = containerRef.current.getBoundingClientRect();
      const graphHeight = typeof height === 'number' ? height : containerHeight;
      graphViewRef.current.updateCanvasSize({ width, height: graphHeight });
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
  }, [graphNotes, graphStyle, height, isLoading, error, handleNodeClick]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Skeleton className="h-4 w-[200px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  if (graphData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        No notes found. Start by creating your first note!
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    />
  );
}
