import { useState, useCallback } from 'react';
import { useUser } from './useUser';
import { createClient } from '@/lib/supabase/browser';
import useNotes from './useNotes';

export interface NoteFormValues {
  id?: string;
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
      const noteData = {
        title: content.split('\n')[0]?.substring(0, 100) || 'Untitled',
        content: content,
        user_id: user.id,
        updated_at: now.toISOString()
      };
      
      console.log('Saving note with data:', noteData);
      
      let result;
      const currentId = values.id; // Capture current ID to avoid closure issues
      
      if (currentId) {
        console.log('Updating existing note with ID:', currentId);
        
        // First, check if the note still exists
        const { data: existingNote, error: fetchError } = await supabase
          .from('notes')
          .select('id')
          .eq('id', currentId)
          .single();
          
        if (fetchError || !existingNote) {
          console.log('Note not found, creating a new one instead');
          // If note doesn't exist, create a new one
          const { data, error: createError } = await supabase
            .from('notes')
            .insert({
              ...noteData,
              created_at: now.toISOString()
            })
            .select()
            .single();
            
          if (createError) throw createError;
          result = data;
          
          // Sync links for the new note
          if (result?.id) {
            console.log('Syncing links for new note:', result.id);
            await syncNoteLinks(result.id, content);
          }
        } else {
          // Note exists, proceed with update
          const { data, error: updateError } = await supabase
            .from('notes')
            .update(noteData)
            .eq('id', currentId)
            .select()
            .single();
            
          if (updateError) throw updateError;
          result = data;
          
          // Sync links for the existing note
          if (result?.id) {
            console.log('Syncing links for existing note:', result.id);
            await syncNoteLinks(result.id, content);
          }
        }
        
        console.log('Note saved and links synced successfully:', result);
      } else if (content) {
        console.log('Creating new note');
        // Create new note only if there's content
        const { data, error } = await supabase
          .from('notes')
          .insert({
            ...noteData,
            created_at: now.toISOString()
          })
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        console.log('Note created successfully:', result);
      }
      
      // Update local state with server response
      if (result) {
        setValues(prev => ({
          ...prev,
          id: result.id,
          content: result.content,
          created_at: result.created_at || now,
          updated_at: result.updated_at || now
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
