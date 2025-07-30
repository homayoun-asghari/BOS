'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import NoteForm from '@/components/notes/NoteForm';
import { Note } from '@/types/note';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function NotePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [note, setNote] = useState<Note | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchNotes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      
      setNotes(data || []);
      
      // If we have a specific note ID to load, fetch it
      if (params?.id) {
        const currentNote = data?.find(n => n.id === params.id);
        if (currentNote) {
          setNote(currentNote);
        } else {
          // Check if there are query parameters
          const hasQueryParams = searchParams.toString().length > 0;
          
          if (hasQueryParams) {
            // Redirect to knowledge graph with the same query parameters
            const queryString = searchParams.toString();
            console.log('Note not found, redirecting to knowledge graph with query params');
            router.push(`/knowledge?view=graph&${queryString}`);
          } else {
            // No query params, go to new note
            console.log('Note not found, redirecting to new note');
            router.push('/notes/new');
          }
          return;
        }
      }
      
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError('Failed to load notes.');
    } finally {
      setIsLoading(false);
    }
  }, [params?.id, router, searchParams]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSave = async (noteData: { content: string; title?: string }) => {
    // Note saved handler - add any additional logic here if needed
    console.log('Note saved:', noteData);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
          <Skeleton className="h-6 w-4/6" />
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex flex-col h-full w-full">
        <div className="px-6 pt-6 w-full">
          <div className="flex justify-between items-center w-full">
            <h1 className="text-2xl font-semibold">Create New Note</h1>
          </div>
        </div>
        <div className="flex-1 min-h-0 p-0 sm:p-4">
          <div className="h-full w-full">
            <NoteForm 
              initialData={{
                id: '',
                content: '',
                title: '',
                type: null,
                status: null,
                tags: [],
                created_at: new Date(),
                updated_at: new Date(),
                user_id: ''
              }}
              onSave={handleSave}
              notes={[]}
              autoSave={true}
            />
          </div>
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/notes/new')}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
            >
              Create New Note
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prepare initial data that matches NoteFormValues
  const initialData = {
    id: note.id,
    content: typeof note.content === 'string' ? note.content : JSON.stringify(note.content),
    title: '', // Will be extracted from content if needed
    type: null,
    status: null,
    tags: [],
    created_at: note.created_at ? new Date(note.created_at) : new Date(),
    updated_at: note.updated_at ? new Date(note.updated_at) : new Date(),
    user_id: note.user_id || ''
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full w-full">
        {/* Scrollable content - no fixed header */}
        <div className="flex-1 min-h-0 p-0">
          <NoteForm 
            key={note.id}
            initialData={initialData}
            onSave={handleSave}
            notes={notes.filter(n => n.id !== note.id).map(n => ({
              ...n,
              content: typeof n.content === 'string' ? n.content : JSON.stringify(n.content)
            }))}
            autoSave={true}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
