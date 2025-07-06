'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import NoteForm from '@/components/notes/NoteForm';
import { Note } from '@/types/note';

export default function NewNotePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchNotes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      
      setNotes(data || []);
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);
  const handleSave = async (noteData: { content: string; title: string }) => {
    // The NoteForm already saves the note
    // This is just a callback for when the save is complete
    console.log('Note saved successfully:', noteData);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {!isLoading && (
        <NoteForm 
          initialData={{
            id: 'new', // Temporary ID for new notes
            content: '',
            type: null,
            status: null,
            tags: []
          }}
          onSave={handleSave}
          autoSave={true}
          notes={notes}
        />
      )}
    </div>
  );
}
