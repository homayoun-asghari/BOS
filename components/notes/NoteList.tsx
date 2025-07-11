'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NoteCard from './NoteCard';

// Create a local Skeleton component
const Skeleton = () => (
  <div className="h-48 w-full rounded-lg bg-muted" />
);

import { fetchNotesWithTags, toggleNotePin, deleteNote } from '@/lib/supabase/notes';

interface NoteWithTags {
  id: string;
  user_id: string;
  title: string;
  content: Record<string, unknown>; // TipTap JSON content
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  content_search: string; // Full-text search vector
  tags: Array<{
    id: string;
    name: string;
    created_at: string;
  }>;
  pinned: boolean; // For Supabase compatibility
}

export interface NoteListProps {
  searchParams?: { search: string; tags?: string[] };
}

export default function NoteList({ searchParams }: NoteListProps) {
  const [allNotes, setAllNotes] = useState<NoteWithTags[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const loadNotes = async () => {
      try {
        setIsLoading(true);
        const data = await fetchNotesWithTags();
        
        if (!data) {
          console.error('No data returned from fetchNotesWithTags');
          throw new Error('No data returned from fetchNotesWithTags');
        }

        setAllNotes(data);
      } catch (err) {
        console.error('Failed to load notes:', err);
        setError(`Failed to load notes: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (isClient) {
      loadNotes();
    }
  }, [isClient]);

  const handlePinToggle = async (noteId: string, pinned: boolean) => {
    try {
      await toggleNotePin(noteId, pinned);
      // Refresh the entire list from the database
      const data = await fetchNotesWithTags();
      setAllNotes(data || []);
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      // Refresh the entire list from the database
      const data = await fetchNotesWithTags();
      setAllNotes(data || []);
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleNavigate = (id: string) => {
    // Get current view state from URL
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') || 'list';
    
    // Preserve view state in URL
    router.push(`/notes/${id}?view=${view}`);
  };

  // Filter notes based on search and tags
  const filteredNotes = allNotes.filter((note: NoteWithTags) => {
    // Initialize conditions
    let tagMatch = true;
    let textMatch = true;

    // Filter by tags (AND condition)
    if (searchParams?.tags?.length) {
      tagMatch = searchParams.tags.every(tag => 
        note.tags.some(noteTag => noteTag.name.toLowerCase() === tag.toLowerCase())
      );
    }
    
    // Filter by search text (OR condition)
    if (searchParams?.search) {
      const searchText = searchParams.search.toLowerCase();
      const titleMatch = note.title.toLowerCase().includes(searchText);
      
      // Use content_search for full-text search
      const contentMatch = note.content_search?.toLowerCase().includes(searchText) || false;
      textMatch = titleMatch || contentMatch;
    }
    
    // Combine conditions: must match tags AND (text search OR no text search)
    return tagMatch && textMatch;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive">{error}</div>
    );
  }

  if (filteredNotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
        <h3 className="text-lg font-medium text-muted-foreground">No notes found</h3>
        <p className="text-sm text-muted-foreground">
          {searchParams?.search || searchParams?.tags?.length ? 
            'No notes match your search criteria' : 
            'Start by creating your first note'
          }
        </p>
      </div>
    );
  }

  // Separate pinned and unpinned notes
  const pinnedNotes = filteredNotes.filter(note => note.is_pinned);
  const unpinnedNotes = filteredNotes.filter(note => !note.is_pinned);

  return (
    <div className="space-y-8">
      {pinnedNotes.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Pinned</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pinnedNotes.map(note => (
              <NoteCard
                key={note.id}
                id={note.id}
                title={note.title}
                content={note.content}
                updatedAt={note.updated_at}
                tags={note.tags}
                isPinned={note.is_pinned}
                onPinToggle={() => handlePinToggle(note.id, !note.is_pinned)}
                onDelete={() => handleDelete(note.id)}
                onNavigate={() => handleNavigate(note.id)}
              />
            ))}
          </div>
        </div>
      )}

      {unpinnedNotes.length > 0 && (
        <div>
          {pinnedNotes.length > 0 && (
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">All Notes</h2>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {unpinnedNotes.map(note => (
              <NoteCard
                key={note.id}
                id={note.id}
                title={note.title}
                content={note.content}
                updatedAt={note.updated_at}
                tags={note.tags}
                isPinned={note.is_pinned}
                onPinToggle={() => handlePinToggle(note.id, !note.is_pinned)}
                onDelete={() => handleDelete(note.id)}
                onNavigate={() => handleNavigate(note.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
