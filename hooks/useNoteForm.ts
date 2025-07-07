import { useState, useCallback } from 'react';
import { useUser } from './useUser';
import { createClient } from '@/lib/supabase/browser';
import useNotes from './useNotes';

export interface NoteFormValues {
  id?: string;
  title: string;
  content: string;
  type: string | null;
  status: string | null;
  tags: string[];
  created_at?: Date | null;
  updated_at?: Date | null;
  user_id?: string;
}

export function useNoteForm(initialValues?: Partial<NoteFormValues>) {
  const [values, setValues] = useState<NoteFormValues>({
    title: initialValues?.title || '',
    content: initialValues?.content || '',
    type: initialValues?.type || null,
    status: initialValues?.status || null,
    tags: initialValues?.tags || [],
    created_at: initialValues?.created_at || null,
    updated_at: initialValues?.updated_at || null,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { user } = useUser();
  const supabase = createClient();

  // Get the notes hook for link synchronization
  const { syncNoteLinks } = useNotes();
  
  // Save note to database and sync links
  const saveNote = useCallback(async (content: string) => {
    console.log('saveNote called with content length:', content?.length);
    
    if (!user) {
      console.error('No user found. Cannot save note.');
      throw new Error('No user found');
    }
    
    try {
      const now = new Date();
      const title = content.split('\n')[0]?.substring(0, 100)?.trim() || '';
      
      const noteData = {
        title: title,
        content: content,
        user_id: user.id,
        updated_at: now.toISOString()
      };
      
      console.log('Saving note with data:', { ...noteData, content_length: content?.length });
      
      // Always use the ID from the URL if available
      const currentId = typeof window !== 'undefined' ? 
        window.location.pathname.split('/').pop() : 
        values?.id;
      
      if (!currentId) {
        console.error('No note ID available for saving');
        throw new Error('No note ID available. Please refresh the page and try again.');
      }
      
      console.log('Updating existing note with ID:', currentId);
      
      // Always update the existing note - it should have been created by the page component
      const { data: result, error: updateError } = await supabase
        .from('notes')
        .update(noteData)
        .eq('id', currentId)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      // Sync links for the note
      if (result?.id) {
        console.log('Syncing links for note:', result.id);
        await syncNoteLinks(result.id, content);
      }
      
      // Update local state with the saved note
      if (result) {
        setValues(prev => ({
          ...prev,
          ...result,
          created_at: result.created_at ? new Date(result.created_at) : new Date(),
          updated_at: new Date()
        }));
      }
      
      return result;
    } catch (error) {
      console.error('Error in saveNote:', error);
      throw error;
    }
  }, [user, values.id, supabase, syncNoteLinks]);

  // Handle field changes
  const handleChange = useCallback(<K extends keyof NoteFormValues>(
    field: K,
    value: NoteFormValues[K]
  ) => {
    setValues(prev => ({
      ...prev,
      [field]: value,
      updated_at: new Date()
    }));
  }, []);

  return {
    values,
    isSaving,
    saveError,
    handleChange,
    saveNote,
    setSaveError,
    setIsSaving
  };
}
