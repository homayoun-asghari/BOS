import { useState, useCallback, useMemo } from 'react';
import { useUser } from './useUser';
import { createClient } from '@/lib/supabase/browser';
import useNotes from './useNotes';
import type { TiptapContent } from '@/components/editor/minimal-tiptap/hooks/use-minimal-tiptap';

type TiptapNode = {
  type?: string;
  text?: string;
  content?: TiptapNode[];
  attrs?: Record<string, unknown>;
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
  const saveNote = useCallback(async (content: TiptapContent | string | null) => {
    console.log('[saveNote] Starting save operation with content type:', typeof content);
    if (content && typeof content === 'object') {
      console.log('[saveNote] Content keys:', Object.keys(content));
    }
    if (!content) return null;
    
    if (!user) {
      const error = new Error('No user found. Cannot save note.');
      console.error(error.message);
      throw error;
    }
    
    try {
      const now = new Date();
      
      // Ensure content is a valid Tiptap JSON object
      const contentToSave = (() => {
        if (typeof content === 'string') {
          // Convert plain text to Tiptap JSON format
          return {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: content ? [{ type: 'text', text: content }] : []
              }
            ]
          };
        } else if (content && typeof content === 'object' && !('type' in content)) {
          // Ensure content has the correct structure
          return {
            type: 'doc',
            content: Array.isArray(content) ? content : [content]
          };
        }
        return content;
      })();
      
      console.log('[saveNote] Extracting title from contentToSave:', JSON.stringify(contentToSave, null, 2));
      
      // Handle case where content is a string that might be JSON
      let contentToProcess: TiptapContent | string = contentToSave;
      if (typeof contentToProcess === 'string') {
        try {
          contentToProcess = JSON.parse(contentToProcess) as TiptapContent;
          console.log('[saveNote] Parsed string content to JSON');
        } catch {
          console.log('[saveNote] Content is not JSON, using as plain text');
        }
      }
      
      // Extract title from the processed content
      const title = extractTitleFromContent(contentToProcess);
      console.log('[saveNote] Extracted title (raw):', title, 'type:', typeof title);
      
      // Ensure title is a plain string
      let titleText = 'Untitled Note';
      if (title) {
        if (typeof title === 'string') {
          // If title is a string, clean it up
          titleText = title.trim();
          
          // If it's a JSON string, try to parse it
          const trimmed = titleText.trim();
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
              (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
              const parsed = JSON.parse(trimmed) as TiptapContent;
              if (parsed && typeof parsed === 'object' && 'content' in parsed) {
                // If it's a Tiptap node, extract text from it
                titleText = extractTitleFromContent(parsed);
                console.log('[saveNote] Extracted title from nested JSON:', titleText);
              }
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.log('[saveNote] Title is not valid JSON, using as is:', errorMessage);
            }
          }
        } else {
          // If title is an object, stringify it
          titleText = JSON.stringify(title);
        }
      }
      
      // Clean up the title text
      titleText = titleText
        .replace(/^\s*[\r\n]+/gm, '') // Remove empty lines at start
        .replace(/[\r\n]+/g, ' ')      // Replace newlines with spaces
        .replace(/\s+/g, ' ')           // Collapse multiple spaces
        .trim()                         // Trim whitespace
        .substring(0, 255);             // Limit length
        
      console.log('[saveNote] Final title:', titleText, 'type:', typeof titleText);
      
      // Verify the title is not JSON
      try {
        const parsed = JSON.parse(titleText);
        console.warn('[saveNote] WARNING: Title still appears to be JSON after processing:', parsed);
        // If we get here, it's JSON - use a default title
        titleText = 'Untitled Note';
      } catch {
        // Not JSON, which is what we want
        console.log('[saveNote] Title is valid plain text');
      }
      
      // Define a type for the text node to handle type checking
      interface TextNode {
        type: 'text';
        text: string;
        [key: string]: unknown;
      }

      // Helper function to check if a string is a JSON string
      const isJsonString = (str: string): boolean => {
        try {
          JSON.parse(str);
          return true;
        } catch {
          return false;
        }
      };

      // Helper function to normalize content structure
      const normalizeContent = (data: unknown): unknown => {
        // Handle strings
        if (typeof data === 'string') {
          // If it's a JSON string, parse it
          if (isJsonString(data)) {
            try {
              return normalizeContent(JSON.parse(data));
            } catch {
              return data; // Return as plain string if parsing fails
            }
          }
          return data; // Return plain strings as-is
        }
        
        // Handle arrays
        if (Array.isArray(data)) {
          return data.map(normalizeContent);
        }
        
        // Handle objects
        if (data && typeof data === 'object') {
          const obj = data as Record<string, unknown>;
          
          // If it's already a valid Tiptap document, return as-is
          if ('type' in obj && obj.type === 'doc' && 'content' in obj) {
            return {
              type: 'doc',
              content: Array.isArray(obj.content) 
                ? obj.content.map(normalizeContent) 
                : []
            };
          }
          
          // Handle text nodes with potential nested documents
          if ('type' in obj && obj.type === 'text' && 'text' in obj) {
            const textNode = obj as TextNode & Record<string, unknown>;
            
            // If text is a nested document, extract its content
            if (textNode.text && 
                typeof textNode.text === 'object' && 
                textNode.text !== null &&
                'type' in textNode.text && 
                textNode.text.type === 'doc' && 
                'content' in textNode.text) {
              
              // Return a new text node with the text property as a string
              return {
                ...obj,
                text: '' // Clear the nested document
              };
            }
          }
          
          // Process all other objects
          const result: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(obj)) {
            if (key === 'text' && value && typeof value === 'object' && 
                'type' in value && value.type === 'doc' && 'content' in value) {
              // If we find a nested doc in a text field, extract its content
              result.content = (value as { content: unknown[] }).content || [];
            } else {
              result[key] = normalizeContent(value);
            }
          }
          return result;
        }
        
        return data;
      };

      // Helper function to fix nested document structures
      const fixNestedDocument = (node: any): any => {
        if (!node) return node;
        
        // If this is a text node with a document in the text property, extract the content
        if (node.type === 'text' && node.text && typeof node.text === 'object' && node.text.type === 'doc') {
          return {
            ...node,
            text: '' // Clear the nested document
          };
        }
        
        // If this is a text node with a string, ensure it's not JSON
        if (node.type === 'text' && typeof node.text === 'string') {
          try {
            const parsed = JSON.parse(node.text);
            if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
              return {
                ...node,
                text: '' // Clear the JSON string
              };
            }
          } catch {
            // Not a JSON string, leave as is
          }
        }
        
        // Process child nodes
        if (node.content && Array.isArray(node.content)) {
          return {
            ...node,
            content: node.content.map(fixNestedDocument)
          };
        }
        
        return node;
      };

      // Process content to ensure it's in the correct format for the database
      const processContentForDatabase = (content: unknown): TiptapContent | null => {
        if (!content) return null;
        
        // First, ensure content is an object
        let contentObj: any;
        if (typeof content === 'string') {
          try {
            contentObj = JSON.parse(content);
          } catch {
            // If it's not valid JSON, wrap it in a document
            return {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: content
                    }
                  ]
                }
              ]
            };
          }
        } else {
          contentObj = content;
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
          return fixedContent as TiptapContent;
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
      
      // Process the content through our sanitization pipeline
      const sanitizedContent = processContentForDatabase(contentToSave);
      
      // Extract plain text for search purposes
      const extractPlainText = (content: TiptapContent | null): string => {
        if (!content) return '';
        
        const extractText = (node: TiptapNode): string => {
          if (!node) return '';
          
          let text = '';
          
          // Add text content if available
          if (node.text) {
            text += node.text + ' ';
          }
          
          // Process child nodes
          if (node.content && Array.isArray(node.content)) {
            text += node.content.map(extractText).join(' ');
          }
          
          return text;
        };
        
        try {
          // Handle both direct content and content within a doc node
          const contentToProcess = 
            (content as { content?: TiptapNode[] }).content || 
            (content as { doc?: { content?: TiptapNode[] } }).doc?.content || 
            [];
            
          if (Array.isArray(contentToProcess)) {
            return contentToProcess.map(extractText).join(' ').trim();
          }
          return extractText(contentToProcess);
        } catch (error) {
          console.error('Error extracting text from content:', error);
          return '';
        }
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

      const noteData = {
        title: titleText, // Already processed as plain text
        content: sanitizedContent, // Properly formatted Tiptap JSON
        // content_search is a generated column, so we don't include it here
        user_id: user.id,
        updated_at: toSafeISOString(now, new Date()),
        created_at: toSafeISOString(values.created_at, now)
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
        content_type: typeof contentToSave,
        user_id: user.id,
        has_content: !!contentToSave
      });
      
      // Get the current note ID from the URL or props
      const currentId = typeof window !== 'undefined' ? 
        window.location.pathname.split('/').pop() : 
        values?.id;
      
      if (!currentId) {
        const error = new Error('No note ID available for saving. Please refresh the page and try again.');
        console.error(error.message, { 
          pathname: typeof window !== 'undefined' ? window.location.pathname : 'undefined',
          values_id: values?.id 
        });
        throw error;
      }
      
      console.log('Saving note with ID:', currentId);
      
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
            const newTitle = extractTitleFromContent(content);
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
            contentLength: content?.length,
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
          const newTitle = extractTitleFromContent(content);
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
        if (updatedNote?.id && content) {
          try {
            console.log('Syncing links for note:', updatedNote.id);
            await syncNoteLinks(updatedNote.id, content);
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
          contentLength: content?.length,
          hasTitle: !!title
        });
        throw new Error(`Failed to save note: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error in saveNote:', {
        message: errorMessage,
        error,
        contentLength: content?.length,
        userId: user?.id
      });
      
      // Create a new error with the message to ensure it's not empty
      const newError = new Error(errorMessage || 'Failed to save note');
      // @ts-expect-error - Add original error for debugging
      newError.originalError = error;
      throw newError;
    }
  }, [user, values.id, values.created_at, supabase, syncNoteLinks, extractTitleFromContent]);

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

  // Memoize the form API to prevent unnecessary re-renders
  return useMemo(() => ({
    values,
    isSaving,
    saveError,
    handleChange,
    saveNote,
    extractTitleFromContent,
    setSaveError,
    setIsSaving
  }), [
    values, 
    isSaving, 
    saveError, 
    handleChange, 
    saveNote,
    extractTitleFromContent,
    setSaveError,
    setIsSaving
  ]);
}
