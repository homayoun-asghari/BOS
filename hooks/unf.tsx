import { useState, useCallback, useMemo } from 'react';
import { useUser } from './useUser';
import { createClient } from '@/lib/supabase/browser';
import useNotes from './useNotes';
import type { TiptapContent } from '@/components/editor/minimal-tiptap/hooks/use-minimal-tiptap';

// Define Tiptap node types
interface TiptapTextNode {
  type: 'text';
  text: string;
  marks?: unknown[];
}

interface TiptapDocNode {
  type: 'doc';
  content: TiptapNode[];
}

interface TiptapParagraphNode {
  type: 'paragraph';
  content?: TiptapNode[];
  text?: string;
}

type TiptapNode = {
  type: string;
  content?: TiptapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: unknown[];
}

export interface NoteFormValues {
  id?: string;
  title: string;
  content: TiptapContent | string | null;
  type: string | null;
  status: string | null;
  tags: string[];
  created_at?: Date | null;
  updated_at?: Date | null;
  user_id?: string;
}

export function useNoteForm(initialValues?: Partial<NoteFormValues>) {
  const [values, setValues] = useState<NoteFormValues>(() => ({
    title: initialValues?.title || '',
    content: initialValues?.content || null,
    type: initialValues?.type || null,
    status: initialValues?.status || null,
    tags: initialValues?.tags || [],
    created_at: initialValues?.created_at || null,
    updated_at: initialValues?.updated_at || null,
  }));
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { user } = useUser();
  const supabase = createClient();
  
  // Memoize the initial values to prevent unnecessary re-renders
  const initialValuesJson = useMemo(() => JSON.stringify(initialValues), [initialValues]);

  // Get the notes hook for link synchronization
  const { syncNoteLinks } = useNotes();
  
  // Process content for database storage
  const processContentForDatabase = useCallback((content: TiptapContent | null): TiptapContent | null => {
    if (!content) return null;
    
    try {
      // If content is a string, parse it first
      const contentObj = typeof content === 'string' ? JSON.parse(content) : content;
      return contentObj;
    } catch (error) {
      console.error('Error processing content for database:', error);
      return content;
    }
  }, []);
  
  // Helper function to safely convert date to ISO string
  const toSafeISOString = useCallback((date: Date | string | null | undefined, fallback: Date): string => {
    try {
      if (!date) return fallback.toISOString();
      const d = typeof date === 'string' ? new Date(date) : date;
      return isNaN(d.getTime()) ? fallback.toISOString() : d.toISOString();
    } catch {
      return fallback.toISOString();
    }
  }, []);

  // Extract plain text title from content (first line only)
  const extractTitleFromContent = useCallback((content: TiptapContent | string | null): string => {
    // Helper function to get first non-empty line from text
    const getFirstLine = (text: string): string => {
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
          content = parsed as TiptapContent;
        } else {
          return getFirstLine(content);
        }
      } catch {
        // If it's not JSON, use the first line as title
        return getFirstLine(content);
      }
    }
    
    // Handle Tiptap content object
    if (content && typeof content === 'object' && 'content' in content) {
      const extractFirstTextNode = (nodes: TiptapNode[] | undefined): string | null => {
        if (!nodes) return null;
        
        for (const node of nodes) {
          // If we find a text node, get its first line
          if (node.type === 'text' && node.text) {
            const firstLine = node.text.split('\n')[0]?.trim();
            if (firstLine) return firstLine;
          }
          
          // Recursively check child nodes
          if (node.content && Array.isArray(node.content)) {
            const result = extractFirstTextNode(node.content);
            if (result) return result;
          }
        }
        
        return null;
      };
      
      if (content.content && Array.isArray(content.content)) {
        const firstLine = extractFirstTextNode(content.content);
        if (firstLine) return firstLine;
      }
    }
    
    // Default fallback
    return 'Untitled Note';
  }, []);
  
  // Save note to database and sync links
  const saveNote = useCallback(async (contentToSave?: TiptapContent | string | null): Promise<NoteFormValues> => {
    // Ensure we have a return value in case of early returns
    const defaultReturn: NoteFormValues = {
      title: '',
      content: null,
      type: null,
      status: null,
      tags: []
    };
    
    // Early return if no user
    if (!user) {
      console.error('No user found');
      return defaultReturn;
    }
    
    // Use the provided content or fall back to the form's content
    const content = contentToSave !== undefined ? contentToSave : values.content;
    
    setIsSaving(true);
    
    console.log('[useNoteForm] ===== Starting saveNote =====');
    console.log('[useForm] Content type:', typeof content);
    
    if (content && typeof content === 'object') {
      console.log('[useForm] Content object keys:', Object.keys(content));
    }
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const now = new Date();
      const currentId = values.id;
      const { title, content: noteContent, type, status, tags } = values;
      
      // Ensure we have the required fields
      if (!noteContent || (typeof noteContent === 'string' && noteContent.trim() === '')) {
        throw new Error('Note content cannot be empty');
      }
      
      const normalizedContent = typeof noteContent === 'string' 
        ? noteContent 
        : JSON.stringify(noteContent);
      
      // Process the content through our sanitization pipeline
      // Note: processContentForDatabase is currently unused but kept for future use
      // const sanitizedContent = processContentForDatabase(normalizedContent);
      
      // Extract plain text for search purposes - exported for testing
      const extractPlainText = (content: TiptapContent | null): string => {
        // Helper function to get first non-empty line from text
        const getFirstLine = (text: string): string => {
          const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
          return lines[0] || 'Untitled Note';
        };
        
        // Handle null/undefined content
        if (!content) return '';
        
        // Handle string content (legacy or plain text)
        if (typeof content === 'string') {
          try {
            // If it's a JSON string, parse it
            const parsed = JSON.parse(content);
            if (parsed && typeof parsed === 'object') {
              content = parsed as TiptapContent;
            } else {
              return getFirstLine(content);
            }
          } catch {
            // If it's not JSON, use the first line as title
            return getFirstLine(content);
          }
        }
        
        // Handle Tiptap content object
        if (content && typeof content === 'object' && 'content' in content) {
          // Process Tiptap document structure
          const processNode = (node: any): string => {
            if (!node) return '';
            
            if (node.type === 'text') {
              return node.text || '';
            }
            
            if (Array.isArray(node.content)) {
              return node.content.map(processNode).join(' ');
            }
            
            return '';
          };
          
          return processNode(content);
        }
        
        return '';
                      text: content
                    }
                  ]
                }
              ]
            };
          }
        } else {
          contentObj = content as TiptapContent;
        }
        
        // Fix any nested document structures
        const fixedContent = fixNestedDocument({
          type: 'doc',
          content: contentObj.type === 'doc' ? contentObj.content : [contentObj]
        });
        
        // Ensure we have a valid document structure
        if (fixedContent && 
            typeof fixedContent === 'object' && 
            'type' in fixedContent && 
            fixedContent.type === 'doc' && 
            Array.isArray(fixedContent.content)) {
          return fixedContent;
        }
        
        // Fallback to a minimal document
        return {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: ''
                }
              ]
            }
          ]
        };
      };
      
      // Define a more specific type for Tiptap nodes to avoid 'property does not exist on type never' errors
  interface TiptapTextNode {
    type: 'text';
    text: string;
    marks?: unknown[];
    [key: string]: unknown;
  }

  interface TiptapDocNode {
    type: 'doc';
    content: TiptapNode[];
    [key: string]: unknown;
  }

  interface TiptapParagraphNode {
    type: 'paragraph';
    content?: TiptapNode[];
    text?: string;
    [key: string]: unknown;
  }

  type TiptapNode = TiptapTextNode | TiptapDocNode | TiptapParagraphNode | {
    type: string;
    content?: TiptapNode[];
    text?: string;
    attrs?: Record<string, unknown>;
    marks?: unknown[];
    [key: string]: unknown;
  };

  const fixNestedDocument = (node: TiptapNode | null | undefined): TiptapNode | null => {
    if (!node) return null;
    
    // Create a new object to avoid mutating the original
    const newNode = { ...node };
    
    // If this is a text node with a document in the text property, extract the content
    if (newNode.type === 'text' && 
        newNode.text && 
        typeof newNode.text === 'object' && 
        'type' in newNode.text && 
        newNode.text.type === 'doc') {
      return {
        ...newNode,
        text: '' // Clear the nested document
      };
    }
    
    // If this is a text node with a string, ensure it's not JSON
    if (newNode.type === 'text' && typeof newNode.text === 'string') {
      try {
        const parsed = JSON.parse(newNode.text);
        if (parsed && typeof parsed === 'object' && 'type' in parsed && parsed.type === 'doc') {
          return {
            ...newNode,
            text: '' // Clear the JSON string
          };
        }
      } catch {
        // Not a JSON string, leave as is
      }
    }
    
    // Process child nodes
    if (newNode.content && Array.isArray(newNode.content)) {
      newNode.content = newNode.content
        .map(fixNestedDocument)
        .filter((n): n is TiptapNode => n !== null);
    }
    
    return newNode;
  };

  // Helper function to extract text from Tiptap content
  const extractText = (node: TiptapNode | null | undefined): string => {
    if (!node) return '';
    
    let result = '';
    
    // Handle text nodes
    if ('text' in node && node.text) {
      result += node.text + ' ';
    }
    
    // Process child nodes
    if ('content' in node && Array.isArray(node.content)) {
      result += node.content.map(extractText).join(' ');
    }
    
    return result.trim();
  };
  
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

      const currentTime = new Date();
      const noteData = {
        title: values.title || '', // Use the title from form values
        content: values.content, // Use the content from form values
        type: values.type,
        status: values.status,
        tags: values.tags,
        user_id: user?.id,
        updated_at: toSafeISOString(currentTime, currentTime),
        created_at: toSafeISOString(values.created_at, currentTime)
      };
      
      console.log('[saveNote] Final note data to save:', {
        title: noteData.title,
        titleType: typeof noteData.title,
        contentType: typeof noteData.content,
        contentKeys: noteData.content ? Object.keys(noteData.content) : 'no content'
      });
      
      console.log('Saving note with data:', { 
        title: title,
        title_length: title.length,
        content_type: typeof noteContent,
        user_id: user.id,
        has_content: !!noteContent
      });
      
      // If we have an ID, update the existing note
      if (currentId) {
        console.log('[saveNote] Updating existing note:', { 
          id: currentId,
          title,
          contentLength: normalizedContent?.length || 0,
          type,
          status,
          tags
        });
        
        try {
          console.log('[saveNote] Attempting to update note with ID:', currentId);
          console.log('[saveNote] Update data:', JSON.stringify(noteData, null, 2));
          
          // First, try to update the existing note
          const { data: updatedNote, error: updateError } = await supabase
            .from('notes')
            .update(noteData)
            .eq('id', currentId)
            .select()
            .single();
            
          // If update fails with "no rows" error, try to insert instead
          if (updateError?.code === 'PGRST116' || updateError?.code === '22P02') {
            console.log('[saveNote] Note does not exist, creating new one with ID:', currentId);
            
            const insertData = { ...noteData, id: currentId };
            console.log('[saveNote] Insert data:', JSON.stringify(insertData, null, 2));
            
            const { data: newNote, error: insertError } = await supabase
              .from('notes')
              .insert([insertData])
              .select()
              .single();
              
            if (insertError) {
              console.error('[saveNote] Failed to create new note:', {
                error: insertError,
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint,
                code: insertError.code
              });
              throw insertError;
            }
            
            console.log('[saveNote] Successfully created new note:', { 
              noteId: newNote.id,
              title: newNote.title,
              titleType: typeof newNote.title
            });
            
            // Update local state
            if (newNote) {
              const newTitle = extractTitleFromContent(noteContent);
              console.log('[saveNote] Updating local state with title:', newTitle);
              
              setValues(prev => ({
                ...prev,
                ...newNote,
                created_at: newNote.created_at ? new Date(newNote.created_at) : now,
                updated_at: now,
                title: newTitle, // Update title in local state
              }));
            }
            
            return newNote;
          }
          
          // If there was another update error, throw it
          if (updateError) {
            console.error('[saveNote] Supabase update error:', {
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
              code: updateError.code,
              noteId: currentId,
              contentLength: noteContent?.length,
              noteData: JSON.stringify(noteData, null, 2)
            });
            throw updateError;
          }
          
          if (!updatedNote) {
            const error = new Error('No data returned from update operation');
            console.error(error.message, { currentId });
            throw error;
          } else {
            // If update was successful
            console.log('[saveNote] Successfully updated note:', { 
              noteId: updatedNote.id,
              title: updatedNote.title,
              titleType: typeof updatedNote.title,
              content: JSON.stringify(updatedNote.content, null, 2)
            });
          }
          
          // Update local state with the updated note data
          if (updatedNote) {
            const newTitle = extractTitleFromContent(noteContent);
            console.log('[saveNote] Updating local state with title:', newTitle);
            
            setValues((prev: NoteFormValues) => ({
              ...prev,
              ...updatedNote,
              created_at: updatedNote.created_at ? new Date(updatedNote.created_at) : now,
              updated_at: now,
              title: newTitle, // Update title in local state
            }));
          }
          
          // Sync links for the note if we have content
          if (updatedNote?.id && noteContent) {
            try {
              console.log('Syncing links for note:', updatedNote.id);
              await syncNoteLinks(updatedNote.id, noteContent);
            } catch (syncError) {
              console.error('Error syncing links (non-fatal):', syncError);
              // Continue even if link sync fails
            }
          }
          
          return updatedNote;
        } catch (dbError) {
          console.error('Database operation failed:', {
            error: dbError,
            noteId: currentId,
            contentLength: noteContent?.length,
            hasTitle: !!title
          });
          throw new Error(`Failed to save note: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
        }
      } else {
        console.log('[saveNote] No ID found, cannot save note');
        throw new Error('No note ID available for saving. Please refresh the page and try again.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error in saveNote:', {
        message: errorMessage,
        error,
        contentLength: values.content ? (typeof values.content === 'string' ? values.content.length : 'object') : 0,
        userId: user?.id || 'unknown'
      });
      
      // Return default values in case of error
      return defaultReturn;
      
      // Create a new error with the message to ensure it's not empty
    }
  }, [user, syncNoteLinks, values, extractTitleFromContent, supabase]);

  // Handle field changes
  const handleChange = useCallback(<T extends keyof NoteFormValues>(field: T, value: NoteFormValues[T]) => {
    console.log(`[useNoteForm] Field '${field}' changed:`, field === 'content' ? JSON.stringify(value, null, 2) : value);
    setValues(prev => {
      const newValues = {
        ...prev,
        [field]: value
      };
      console.log('[useNoteForm] New values after change:', JSON.stringify(newValues, null, 2));
      return {
        ...newValues,
        updated_at: new Date()
    saveError, 
    handleChange, 
    saveNote,
    extractTitleFromContent,
    setSaveError,
    setIsSaving
  ]);
}
