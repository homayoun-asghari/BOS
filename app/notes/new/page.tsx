'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/browser';
import NoteForm from '@/components/notes/NoteForm';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';

const supabase = createClient();

export default function NewNotePage() {
  const router = useRouter();
  const [noteId, setNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCreatingRef = useRef(false);

  // Track note content for cleanup
  const noteContentRef = useRef({ title: '', content: '' });
  const hasContentRef = useRef(false);
  
  // Update content ref when note content changes
  const handleContentChange = useCallback((content: string, title: string) => {
    noteContentRef.current = { content, title };
    // Track if the note has any content
    hasContentRef.current = title.trim() !== '' || content.trim() !== '';
  }, []);
  
  // Cleanup empty notes on unmount or navigation
  useEffect(() => {
    // Capture the current values in the effect
    const currentNoteId = noteId;
    const currentContent = { ...noteContentRef.current };
    
    return () => {
      const cleanupEmptyNote = async () => {
        if (!currentNoteId) return;
        
        try {
          // Only delete if the note is completely empty
          if (currentContent.title.trim() === '' && currentContent.content.trim() === '') {
            console.log('[NewNotePage] Cleaning up empty note:', currentNoteId);
            const { error } = await supabase
              .from('notes')
              .delete()
              .eq('id', currentNoteId);
              
            if (error) {
              console.error('[NewNotePage] Error deleting empty note:', error);
            } else {
              console.log('[NewNotePage] Successfully cleaned up empty note');
            }
          } else {
            console.log('[NewNotePage] Note has content, skipping cleanup');
          }
        } catch (err) {
          console.error('[NewNotePage] Error during cleanup:', err);
        }
      };
      
      // Only cleanup if we're actually navigating away (not just a re-render)
      if (document.visibilityState === 'hidden' || !hasContentRef.current) {
        cleanupEmptyNote();
      }
    };
  }, [noteId]);
  
  // Add beforeunload handler to catch page refresh/closing tab
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (noteId && !hasContentRef.current) {
        // This will trigger the cleanup in the effect above
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [noteId]);
  
  // Create new note
  useEffect(() => {
    if (isCreatingRef.current) {
      console.log('[NewNotePage] Note creation already in progress or done');
      return;
    }
  
    isCreatingRef.current = true;
  
    async function createNewNote() {
      try {
        console.log('[NewNotePage] Starting note creation...');
  
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
  
        console.log('[NewNotePage] Got user:', user, 'error:', userError);
  
        if (userError || !user) {
          throw new Error('User not authenticated');
        }
  
        const newNoteId = uuidv4();
        const now = new Date().toISOString();
  
        console.log('[NewNotePage] Creating note in DB with ID:', newNoteId);
  
        const { error: createError } = await supabase
          .from('notes')
          .insert({
            id: newNoteId,
            user_id: user.id,
            title: '',
            content: '',
            created_at: now,
            updated_at: now,
          });
  
        if (createError) throw createError;
  
        console.log('[NewNotePage] Note created successfully:', newNoteId);
  
        setNoteId(newNoteId);
        setIsLoading(false);
  
        // Update URL without triggering a navigation
        window.history.replaceState({}, '', `/notes/${newNoteId}`);
        console.log('[NewNotePage] State updated, isLoading=false');
      } catch (err) {
        console.error('[NewNotePage] Error creating note:', err);
        setError('Failed to create a new note. Please try again.');
        setIsLoading(false);
      }
    }
  
    createNewNote();
  }, [router]);
    

  const handleSave = useCallback(
    async (noteData: { content: string; title: string; id: string }) => {
      if (!noteData.id) {
        console.error('[NewNotePage] Cannot save note: No ID provided');
        return;
      }

      try {
        console.log('[NewNotePage] Saving note:', { id: noteData.id, title: noteData.title });

        // Update the tracked content
        noteContentRef.current = {
          title: noteData.title || '',
          content: noteData.content || ''
        };

        // Save the note
        const { error } = await supabase
          .from('notes')
          .update({
            title: noteData.title || '',
            content: noteData.content || '',
            updated_at: new Date().toISOString(),
          })
          .eq('id', noteData.id);

        if (error) throw error;

        console.log('[NewNotePage] Successfully saved note:', noteData.id);
      } catch (err) {
        console.error('[NewNotePage] Error saving note:', err);
        throw err;
      }
    },
    []
  );

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center" data-testid="loading">
        Creating new note...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500" data-testid="error">
        {error}
      </div>
    );
  }

  if (!noteId) {
    return (
      <div className="p-4" data-testid="no-note-id">
        Failed to create note. Please try again.
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background" data-testid="new-note-page">
      <p className="p-4 text-green-600">Note created with ID: {noteId}</p>
      <NoteForm
        key={noteId}
        noteId={noteId}
        initialData={{
          id: noteId,
          title: '',
          content: '',
          type: null,
          status: null,
          tags: []
        }}
        onSave={handleSave}
        onContentChange={handleContentChange}
        autoSave={true}
        debounceMs={1500}
        notes={[]}
      />
    </div>
  );
}
