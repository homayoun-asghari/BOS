import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { useUser } from './useUser';
import useNotes from './useNotes';
import { NoteFormValues, DEFAULT_NOTE_VALUES } from '@/types/note-form';
import { cleanupNoteAttachments } from '@/lib/editor/attachments';
import { TiptapNode, TiptapContent } from '@/types/tiptap';

// Helper type for Supabase client
type SupabaseClient = ReturnType<typeof createClient>;

type SaveNoteFunction = (contentToSave?: unknown) => Promise<NoteFormValues>;

// Helper function to safely convert date to ISO string
const toSafeISOString = (date: Date | string | null | undefined, fallback: Date): string => {
  try {
    if (!date) return fallback.toISOString();
    const d = typeof date === 'string' ? new Date(date) : date;
    return isNaN(d.getTime()) ? fallback.toISOString() : d.toISOString();
  } catch {
    return fallback.toISOString();
  }
};

interface UseNoteFormReturn {
  // Form state
  values: NoteFormValues;
  setValues: React.Dispatch<React.SetStateAction<NoteFormValues>>;
  
  // Loading and error states
  isSaving: boolean;
  setIsSaving: (isSaving: boolean) => void;
  saveError: string | null;
  setSaveError: (error: string | null) => void;
  
  // Methods
  saveNote: SaveNoteFunction;
  handleChange: <T extends keyof NoteFormValues>(field: T, value: NoteFormValues[T]) => void;
  extractTitleFromContent: (content: unknown) => string;
  
  // Direct access to values for backward compatibility
  title: string;
  content: TiptapContent | string | null;
  type: string | null;
  status: string | null;
  tags: string[];
  created_at?: Date | null;
  updated_at?: Date | null;
  user_id?: string;
}

export function useNoteForm(initialValues: Partial<NoteFormValues> = {}): UseNoteFormReturn {
  const [values, setValues] = useState<NoteFormValues>(() => ({
    ...DEFAULT_NOTE_VALUES,
    ...initialValues
  }));
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { user } = useUser();
  const { syncNoteLinks } = useNotes();
  
  // Memoize Supabase client
  const supabase = useMemo(() => createClient(), []);



  // Extract plain text title from content (first line only)
  // Process content for saving
  const processContent = useCallback((content: unknown): TiptapNode | null => {
    if (!content) return null;
    if (typeof content === 'string') {
      try {
        return JSON.parse(content) as TiptapNode;
      } catch {
        return null;
      }
    }
    return content as TiptapNode;
  }, []);

  // Extract title from content (first line only)
  const extractTitleFromContent = useCallback((content: unknown): string => {
    // Helper function to get first non-empty line from text
    const getFirstLine = (text: string): string => {
      if (!text) return 'Untitled Note';
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
      return lines[0] || 'Untitled Note';
    };

    // Handle null/undefined content
    if (!content) return 'Untitled Note';
    
    // Handle string content (legacy or plain text)
    if (typeof content === 'string') {
      try {
        // If it's a JSON string, parse it
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          return extractTitleFromContent(parsed);
        }
        return getFirstLine(content);
      } catch {
        // If it's not JSON, use the first line as title
        return getFirstLine(content);
      }
    }
    
    // Handle Tiptap content object
    if (content && typeof content === 'object') {
      const contentObj = content as Record<string, unknown>;
      
      // If it's a text node with text property
      if (contentObj.text && typeof contentObj.text === 'string') {
        return getFirstLine(contentObj.text);
      }
      
      // If it has a content array, process it
      if (Array.isArray(contentObj.content)) {
        for (const node of contentObj.content) {
          if (node && typeof node === 'object') {
            const text = extractTitleFromContent(node);
            if (text && text !== 'Untitled Note') {
              return text;
            }
          }
        }
      }
    }
    
    // Default fallback
    return 'Untitled Note';
  }, []);

  // Memoize the saveNote function to prevent unnecessary re-renders
  const handleChange = useCallback(<T extends keyof NoteFormValues>(
    field: T, 
    value: NoteFormValues[T]
  ) => {
    setValues(prev => ({
      ...prev,
      [field]: value,
      updated_at: new Date()
    }));
  }, []);

  const saveNote = useCallback<SaveNoteFunction>(async (contentToSave?: unknown) => {
    if (!user) {
      throw new Error('User must be authenticated to save notes');
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const now = new Date();
      const content = contentToSave !== undefined ? contentToSave : values.content;
      const processedContent = processContent(content as TiptapNode);

      if (!processedContent) {
        throw new Error('Invalid note content');
      }

      // Extract title from content if title is empty
      const title = values.title || extractTitleFromContent(processedContent);

      // Only include fields that exist in the database schema
      const noteData: Partial<NoteFormValues> = {
        content: processedContent as TiptapContent,
        user_id: user.id,
        updated_at: now,
        title: title
      };

      // Only include created_at for new notes
      if (!values.id) {
        noteData.created_at = values.created_at || now;
      }

      const { data: savedNote, error } = values.id
        ? await updateExistingNote(supabase, values.id, noteData as NoteFormValues)
        : await createNewNote(supabase, noteData as NoteFormValues);

      if (error) throw error;
      if (!savedNote) throw new Error('Failed to save note');

      // Update local state
      setValues(prev => ({
        ...prev,
        ...savedNote,
        created_at: savedNote.created_at ? new Date(savedNote.created_at) : now,
        updated_at: now
      }));

      // Clean up orphaned attachments if content exists and we have a saved note ID
      if (savedNote.id && content) {
        try {
          const contentString = typeof content === 'string' ? content : JSON.stringify(content);
          await cleanupNoteAttachments(savedNote.id, contentString);
        } catch (cleanupError) {
          console.error('Error cleaning up attachments (non-fatal):', cleanupError);
        }
      }

      // Sync links if content exists
      if (savedNote.id && content) {
        try {
          await syncNoteLinks(savedNote.id, content as TiptapNode);
        } catch (syncError) {
          console.error('Error syncing links (non-fatal):', syncError);
        }
      }

      return savedNote;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSaveError(errorMessage);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [user, syncNoteLinks, values, supabase, extractTitleFromContent, processContent, setIsSaving, setSaveError, setValues]);

  // Return all values and methods
  const result: UseNoteFormReturn = {
    // Form state
    values,
    setValues,
    
    // Loading and error states
    isSaving,
    setIsSaving: (value: boolean) => setIsSaving(value),
    saveError,
    setSaveError: (error: string | null) => setSaveError(error),
    
    // Methods
    saveNote,
    handleChange,
    extractTitleFromContent,
    
    // Direct access to values for backward compatibility
    title: values.title || '',
    content: values.content,
    type: values.type,
    status: values.status,
    tags: values.tags || [],
    created_at: values.created_at,
    updated_at: values.updated_at,
    user_id: values.user_id
  };

  return result;
}

// Database operations
async function updateExistingNote(
  supabase: SupabaseClient,
  id: string, 
  data: NoteFormValues
) {
  const response = await supabase
    .from('notes')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (response.error) {
    console.error('Error updating note:', response.error);
    throw response.error;
  }
  
  return response;
}

async function createNewNote(
  supabase: SupabaseClient,
  data: NoteFormValues
) {
  const response = await supabase
    .from('notes')
    .insert([data])
    .select()
    .single();
  
  if (response.error) {
    console.error('Error creating note:', response.error);
    throw response.error;
  }
  
  return response;
}
