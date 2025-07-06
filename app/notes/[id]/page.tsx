'use client';

import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import NoteForm from '@/components/notes/NoteForm';
import { Note } from '@/types/note';

export default function NotePage() {
  const router = useRouter();
  const params = useParams();
  const [note, setNote] = useState<Note | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  
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
          console.log('Note not found, redirecting to new note');
          router.push('/notes/new');
          return;
        }
      }
      
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError('Failed to load notes.');
    } finally {
      setIsLoading(false);
    }
  }, [params?.id, router, supabase]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSave = async (noteData: { content: string; title: string }) => {
    console.log('Note saved:', noteData);
    // You can add additional logic here if needed when a note is saved
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="text-red-500 text-lg mb-4">{error || 'Note not found'}</div>
        <button
          onClick={() => router.push('/notes/new')}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
        >
          Create New Note
        </button>
      </div>
    );
  }

  // Prepare initial data that matches NoteFormValues
  const initialData = {
    id: note.id,
    content: note.content || '',
    // Extract first line as title for the form
    type: null,
    status: null,
    tags: note.tags || [],
    created_at: new Date(note.createdAt),
    updated_at: new Date(note.updatedAt),
    user_id: note.userId
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <NoteForm 
        key={note.id} // Force re-render when note changes
        initialData={initialData}
        onSave={handleSave}
        notes={notes.filter(n => n.id !== note.id)} // Pass all notes except the current one
        autoSave={true}
      />
    </div>
  );
}
