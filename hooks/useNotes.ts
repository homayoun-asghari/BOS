import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Note, NoteFormData } from '@/types/note';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { TiptapContent } from '@/components/editor/minimal-tiptap/hooks/use-minimal-tiptap';

// Define types for Tiptap nodes and marks
interface TiptapMark {
  type: string;
  attrs?: {
    href?: string;
    [key: string]: unknown;
  };
}

interface TiptapTextNode {
  type: 'text';
  text?: string;
  marks?: TiptapMark[];
}

interface TiptapParentNode {
  type: string;
  content?: TiptapNode[];
  [key: string]: unknown;
}

type TiptapNode = TiptapTextNode | TiptapParentNode;

// Type for note links
interface InternalLink {
  type: 'internal';
  id: string;
  text: string;
}

interface ExternalLink {
  type: 'external';
  url: string;
  text: string;
}

type NoteLink = InternalLink | ExternalLink;

// Track in-flight requests to prevent race conditions
const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const userId = user?.id ?? '';
  
  // Track in-flight requests
  const activeRequests = useRef<Record<string, AbortController>>({});
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    const currentRequests = activeRequests.current;
    return () => {
      isMounted.current = false;
      // Abort all pending requests on unmount
      Object.values(currentRequests).forEach(controller => {
        controller.abort();
      });
    };
  }, []);

  // Helper function to handle API requests with abort controller
  const makeRequest = useCallback(async <T>(
    key: string,
    requestFn: (signal: AbortSignal) => Promise<T>,
    options: { skipAuthCheck?: boolean } = {}
  ): Promise<T> => {
    if (!options.skipAuthCheck && !user) {
      throw new Error('Authentication required');
    }

    // Abort any existing request with the same key
    if (activeRequests.current[key]) {
      activeRequests.current[key].abort();
    }

    // Create new abort controller
    const controller = new AbortController();
    const currentActiveRequests = activeRequests.current;
    currentActiveRequests[key] = controller;

    try {
      const result = await requestFn(controller.signal);
      
      // Remove this request from active requests
      if (isMounted.current) {
        delete currentActiveRequests[key];
      }
      
      return result;
    } catch (error) {
      // Don't throw for aborted requests
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      
      // Re-throw other errors
      throw error;
    }
  }, [user]);

  const fetchNotes = useCallback(async (options: { forceRefresh?: boolean } = {}) => {
    if (!userId) return [];
    
    const requestKey = `fetch-notes-${userId}`;
    
    try {
      // Only set loading state if not already loading or if force refresh
      if (!isLoading || options.forceRefresh) {
        setIsLoading(true);
        setError(null);
      }
      
      const data = await makeRequest<Note[]>(
        requestKey,
        async (signal) => {
          // Create a promise that will be rejected if the signal is aborted
          const abortPromise = new Promise<never>((_, reject) => {
            if (signal.aborted) {
              reject(new Error('Request was cancelled'));
            }
            signal.addEventListener('abort', () => {
              reject(new Error('Request was cancelled'));
            });
          });
          
          // Race between the actual request and the abort signal
          const requestPromise = supabase
            .from('notes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
              if (error) throw error;
              return data || [];
            });
          
          return Promise.race([requestPromise, abortPromise]);
        }
      );
      
      if (isMounted.current) {
        setNotes(data);
      }
      
      return data;
    } catch (err) {
      const error = err as Error;
      console.error('Error in fetchNotes:', error);
      
      if (isMounted.current) {
        setError(error);
      }
      
      // Re-throw to allow error handling in components
      throw error;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [userId, makeRequest, isLoading]);

  const createNote = useCallback(async (noteData: NoteFormData) => {
    if (!user) {
      throw new Error('Authentication required to create notes');
    }

    const requestKey = `create-note-${Date.now()}`;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const now = new Date().toISOString();
      
      // Extract the first line or first 50 characters as title if not provided
      const content = typeof noteData.content === 'string' ? noteData.content : '';
      const firstLine = content ? content.split('\n')[0] : '';
      const title = noteData.title || (firstLine ? firstLine.trim().substring(0, 50) : 'Untitled Note');
      
      const notePayload = {
        title,
        content,
        user_id: user.id,
        created_at: now,
        updated_at: now,
        folder_id: noteData.folder_id || null,
        is_archived: noteData.is_archived || false,
        is_pinned: noteData.is_pinned || false,
        color: noteData.color || null,
        tags: noteData.tags || []
      };
      
      const newNote = await makeRequest<Note>(
        requestKey,
        async (signal) => {
          // Create a promise that will be rejected if the signal is aborted
          const abortPromise = new Promise<never>((_, reject) => {
            if (signal.aborted) {
              reject(new Error('Request was cancelled'));
            }
            signal.addEventListener('abort', () => {
              reject(new Error('Request was cancelled'));
            });
          });
          
          // Race between the actual request and the abort signal
          const requestPromise = supabase
            .from('notes')
            .insert(notePayload)
            .select()
            .single()
            .then(({ data, error }) => {
              if (error) throw error;
              return data;
            });
          
          return Promise.race([requestPromise, abortPromise]);
        }
      );
      
      if (isMounted.current) {
        setNotes(prevNotes => [newNote, ...prevNotes]);
      }
      
      return newNote;
    } catch (err) {
      const error = err as Error;
      console.error('Error creating note:', error);
      
      if (isMounted.current) {
        setError(error);
      }
      
      throw error;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [user, makeRequest]);

  const updateNote = useCallback(async (id: string, noteData: Partial<NoteFormData>) => {
    try {
      // Get the current user from the hook
      const currentUser = user;
      
      if (!currentUser) {
        console.error('No authenticated user found when trying to update note');
        throw new Error('Authentication required to update notes');
      }
      
      setIsLoading(true);
      const now = new Date().toISOString();
      
      // Prepare update payload with only defined fields
      const updatePayload: Partial<NoteFormData> = {
        ...noteData,
        updated_at: now,
        user_id: currentUser.id // Ensure we're setting the correct user_id
      };
      
      // If content is updated, update the title if not explicitly set
      if (noteData.content && !noteData.title) {
        const content = noteData.content || '';
        updatePayload.title = content.split('\n')[0]?.trim().substring(0, 50) || 'Untitled Note';
      }

      console.log('Updating note with data:', { id, ...updatePayload });
      
      // Make the update with the latest user ID
      const { data, error } = await supabase
        .from('notes')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', currentUser.id) // Additional security check
        .select()
        .single();
        
      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(error.message || 'Failed to update note');
      }
      
      console.log('Note updated successfully:', data);
      return data;
    } catch (err) {
      console.error('Error updating note:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, setIsLoading, setError]);

  const deleteNote = useCallback(async (id: string) => {
    // Get the current user from the hook
    const currentUser = user;
    
    if (!currentUser) {
      console.error('No authenticated user found when trying to delete note');
      throw new Error('Authentication required to delete notes');
    }

    try {
      setIsLoading(true);
      console.log(`Starting deletion of note ${id}`);

      // Step 1: Verify the note exists and belongs to the user
      const { data: note, error: noteError } = await supabase
        .from('notes')
        .select('id')
        .eq('id', id)
        .eq('user_id', currentUser.id)
        .single();

      if (noteError || !note) {
        console.error('Note not found or access denied:', noteError);
        throw new Error('Note not found or access denied');
      }

      // Step 2: Fetch all attachments related to this note
      const { data: attachments, error: fetchError } = await supabase
        .from('attachments')
        .select('id, storage_path')
        .eq('note_id', id)
        .eq('user_id', currentUser.id); // Ensure user owns the attachments

      if (fetchError) {
        console.error('Error fetching attachments:', fetchError);
        throw fetchError;
      }

    console.log(`Found ${attachments?.length || 0} attachments`);

    // Step 2: Delete all files from Supabase storage
    const filePaths = (attachments || [])
      .map(att => att.storage_path?.replace(/^notes-attachments\//, ''))
      .filter((p): p is string => !!p);

    if (filePaths.length > 0) {
      const { error: deleteFilesError } = await supabase
        .storage
        .from('notes-attachments')
        .remove(filePaths);

      if (deleteFilesError) {
        console.error('Error deleting files from storage:', deleteFilesError);
        // Continue even if some files fail
      } else {
        console.log('Successfully deleted files from storage:', filePaths);
      }
    }

    // Step 3: Delete attachment records from DB
    const { error: deleteAttachmentsError } = await supabase
      .from('attachments')
      .delete()
      .eq('note_id', id);

    if (deleteAttachmentsError) {
      console.error('Error deleting attachment records:', deleteAttachmentsError);
      // Continue even if DB cleanup fails
    }

    // Step 4: Delete the note itself
    const { error: deleteNoteError } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (deleteNoteError) {
      console.error('Error deleting note:', deleteNoteError);
      throw deleteNoteError;
    }

    console.log(`Successfully deleted note ${id} and all its attachments.`);
  } catch (err) {
    console.error('Error in deleteNote:', err);
    setError(err as Error);
    throw err;
  } finally {
    setIsLoading(false);
  }
}, [user, setIsLoading, setError]);


  // Search notes using full-text search
  const searchNotes = useCallback(async (query: string) => {
    // Get the current user from the hook
    const currentUser = user;
    
    if (!currentUser) {
      console.error('No authenticated user found when searching notes');
      return [];
    }
    
    try {
      setIsLoading(true);
      
      if (!query.trim()) {
        // If query is empty, return recent notes
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('updated_at', { ascending: false })
          .limit(10);
          
        if (error) throw error;
        return data || [];
      }
      
      // Try full-text search first
      const { data: searchData, error: searchError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', currentUser.id)
        .textSearch('content_search', query, {
          type: 'websearch',
          config: 'english'
        })
        .order('updated_at', { ascending: false })
        .limit(10);
        
      if (!searchError) {
        return searchData || [];
      }
      
      // Fallback to ILIKE if full-text search fails
      console.warn('Full-text search failed, falling back to ILIKE:', searchError);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', currentUser.id)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('updated_at', { ascending: false })
        .limit(10);
        
      if (fallbackError) throw fallbackError;
      return fallbackData || [];
    } catch (err) {
      console.error('Error searching notes:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, setIsLoading, setError]);

  // Create an external link from a note to a URL
  const createExternalLink = useCallback(async (sourceNoteId: string, url: string, linkText?: string) => {
    // Get the current user from the hook
    const currentUser = user;
    
    if (!currentUser) {
      console.error('No authenticated user found when creating external link');
      throw new Error('Authentication required to create external links');
    }
    
    console.log('Starting createExternalLink with:', { 
      sourceNoteId, 
      url, 
      linkText,
      userId: currentUser.id
    });
    
    try {
      setIsLoading(true);
      
      // Verify the source note exists and belongs to the user
      console.log('Verifying source note...');
      const { data: sourceNote, error: sourceError } = await supabase
        .from('notes')
        .select('id, title, user_id')
        .eq('id', sourceNoteId)
        .eq('user_id', currentUser.id) // Add user_id check for security
        .single();

      console.log('Source note query result:', { sourceNote, sourceError });

      if (sourceError || !sourceNote) {
        const error = new Error(`Source note not found or access denied: ${sourceError?.message || 'No data returned'}`);
        console.error(error);
        throw error;
      }

      // Prepare the data to insert with user context
      const linkData = {
        note_id: sourceNoteId,
        user_id: currentUser.id, // Include user_id for RLS
        link_type: 'external',
        url: url,
        link_text: linkText || url,
        created_at: new Date().toISOString()
      };
      
      console.log('Creating external link with data:', { ...linkData, url: '[REDACTED]' });

      // Create the link in the database
      const { data, error } = await supabase
        .from('note_links')
        .insert(linkData)
        .select()
        .single();

      if (error) {
        console.error('Error creating external link:', {
          error: {
            message: error.message,
            code: error.code,
            details: error.details
          },
          noteId: sourceNoteId,
          userId: currentUser.id
        });
        
        // Check if the error is due to RLS
        if (error.message.includes('permission denied') || error.code === '42501') {
          console.error('RLS Policy Error: The operation was blocked by Row Level Security');
          // Provide more context about the RLS error
          console.error('This might be due to missing RLS policies on the note_links table');
        }
        
        throw new Error(`Failed to create external link: ${error.message} (Code: ${error.code})`);
      }

      console.log('External link created successfully with ID:', data?.id);
      return data;
    } catch (err) {
      console.error('Error in createExternalLink:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, setIsLoading, setError]);

  // Create a link between two notes
  const createNoteLink = useCallback(async (sourceNoteId: string, targetNoteId: string, linkText?: string) => {
    // Get the current user from the hook
    const currentUser = user;
    
    if (!currentUser) {
      console.error('No authenticated user found when creating note link');
      throw new Error('Authentication required to create note links');
    }
    
    console.log('Starting createNoteLink with:', { 
      sourceNoteId, 
      targetNoteId, 
      linkText,
      userId: currentUser.id
    });
    
    try {
      setIsLoading(true);
      
      // Define types for the note responses
      type NoteResponse = {
        id: string;
        user_id: string;
        title?: string;
      };
      
      // Verify both notes exist and belong to the user in a single query
      console.log('Verifying source and target notes...');
      const [
        { data: sourceNote, error: sourceError },
        { data: targetNote, error: targetError }
      ] = await Promise.all([
        supabase
          .from('notes')
          .select('id, user_id, title')
          .eq('id', sourceNoteId)
          .eq('user_id', currentUser.id)
          .single<NoteResponse>(),
        supabase
          .from('notes')
          .select('id, user_id, title')
          .eq('id', targetNoteId)
          .eq('user_id', currentUser.id)
          .single<NoteResponse>()
      ]);
      
      // Check for errors in source note
      if (sourceError || !sourceNote) {
        const error = new Error(`Source note not found or access denied: ${sourceError?.message || 'No data returned'}`);
        console.error(error);
        throw error;
      }
      
      // Check for errors in target note
      if (targetError || !targetNote) {
        const error = new Error(`Target note not found or access denied: ${targetError?.message || 'No data returned'}`);
        console.error(error);
        throw error;
      }

      // Prepare the data to insert
      // Note: We're not including user_id as it's not in the note_links table
      // We're relying on RLS (Row Level Security) to ensure users can only access their own data
      const linkData = {
        note_id: sourceNoteId,
        link_type: 'internal',
        target_note_id: targetNoteId,
        url: null, // Explicitly set to null for internal links
        link_text: linkText || targetNote.title || 'Untitled Note',
        created_at: new Date().toISOString()
      };
      
      console.log('Creating note link with data:', { 
        ...linkData, 
        link_text: linkData.link_text ? '[text]' : 'empty' 
      });

      // Create the link in the database
      const { data, error } = await supabase
        .from('note_links')
        .insert(linkData)
        .select()
        .single();

      if (error) {
        console.error('Error creating note link:', {
          error: {
            message: error.message,
            code: error.code,
            details: error.details
          },
          noteId: sourceNoteId,
          targetNoteId,
          userId: currentUser.id
        });
        
        // Check if the error is due to RLS
        if (error.message.includes('permission denied') || error.code === '42501') {
          console.error('RLS Policy Error: The operation was blocked by Row Level Security');
        }
        
        // Check if the error is due to a foreign key constraint
        if (error.code === '23503') {
          console.error('Foreign key constraint violation. Check if the referenced note exists.');
        }
        
        throw new Error(`Failed to create note link: ${error.message} (Code: ${error.code})`);
      }

      console.log('Note link created successfully with ID:', data?.id);
      return data;
    } catch (err) {
      console.error('Error in createNoteLink:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, setIsLoading, setError]);

  // Get all links for a specific note
  const getNoteLinks = useCallback(async (noteId: string) => {
    // Get the current user from the hook
    const currentUser = user;
    
    if (!currentUser) {
      const error = new Error('Authentication required to fetch note links');
      console.error('No authenticated user found when fetching note links');
      setError(error);
      throw error;
    }
    
    if (!noteId) {
      const error = new Error('Note ID is required to fetch note links');
      console.error('No noteId provided to getNoteLinks');
      setError(error);
      throw error;
    }
    
    setIsLoading(true);
    
    console.log('Fetching note links for note:', { 
      noteId, 
      userId: currentUser.id,
      timestamp: new Date().toISOString()
    });
    
    try {
      // First verify the note exists and belongs to the user
      const { data: note, error: noteError } = await supabase
        .from('notes')
        .select('id')
        .eq('id', noteId)
        .eq('user_id', currentUser.id)
        .single();
        
      if (noteError || !note) {
        const error = new Error(`Note not found or access denied: ${noteError?.message || 'No data returned'}`);
        console.error('Note access error:', {
          error: noteError,
          noteId,
          userId: currentUser.id,
          noteExists: !!note
        });
        setError(error);
        throw error;
      }
      
      // Now fetch the links - removed user_id filter since the column doesn't exist
      // We're relying on RLS (Row Level Security) to ensure users can only access their own data
      const { data, error } = await supabase
        .from('note_links')
        .select('*')
        .eq('note_id', noteId);
        
      if (error) {
        const errorDetails = {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          noteId,
          userId: currentUser.id
        };
        
        console.error('Error fetching note links:', errorDetails);
        
        // Check if the error is due to RLS
        if (error.message?.includes('permission denied') || error.code === '42501') {
          console.error('RLS Policy Error: The operation was blocked by Row Level Security');
        }
        
        const enhancedError = new Error(`Failed to fetch note links: ${error.message}`);
        Object.assign(enhancedError, errorDetails);
        setError(enhancedError);
        throw enhancedError;
      }
      
      console.log(`Found ${data?.length || 0} links for note ${noteId}`);
      return data || [];
    } catch (err) {
      const error = err as Error;
      console.error('Unexpected error in getNoteLinks:', {
        error: error.message,
        stack: error.stack,
        noteId,
        userId: currentUser?.id || 'no-user'
      });
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, setIsLoading, setError]);

  // Delete a specific note link
  const deleteNoteLink = useCallback(async (linkId: string) => {
    // Get the current user from the hook
    const currentUser = user;
    
    if (!currentUser) {
      console.error('No authenticated user found when deleting note link');
      throw new Error('Authentication required to delete note links');
    }
    
    try {
      setIsLoading(true);
      
      console.log('Deleting note link:', { 
        linkId, 
        userId: currentUser.id 
      });
      
      // First verify the link exists
      // We're not checking user_id here as it's not in the note_links table
      // RLS (Row Level Security) will handle access control
      const { data: link, error: fetchError } = await supabase
        .from('note_links')
        .select('id')
        .eq('id', linkId)
        .single();
        
      if (fetchError || !link) {
        const error = new Error(`Link not found or access denied: ${fetchError?.message || 'No data returned'}`);
        console.error(error);
        throw error;
      }
      
      // Now delete the link
      // We're not filtering by user_id as it's not in the note_links table
      // RLS (Row Level Security) will handle access control
      const { error } = await supabase
        .from('note_links')
        .delete()
        .eq('id', linkId);
        
      if (error) {
        console.error('Error deleting note link:', {
          error: {
            message: error.message,
            code: error.code,
            details: error.details
          },
          linkId,
          userId: currentUser.id
        });
        
        // Check if the error is due to RLS
        if (error.message.includes('permission denied') || error.code === '42501') {
          console.error('RLS Policy Error: The operation was blocked by Row Level Security');
        }
        
        throw error;
      }
      
      console.log('Successfully deleted note link:', linkId);
      return true;
    } catch (err) {
      console.error('Error in deleteNoteLink:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, setIsLoading, setError]);

  /**
   * Extracts note links from markdown content
   * @param content - The markdown content to extract links from
   * @returns Array of extracted note links matching the NoteLink type
   */
  const extractNoteLinks = useCallback((content: string): NoteLink[] => {
    if (!content || typeof content !== 'string') {
      console.warn('extractNoteLinks: Invalid content provided');
      return [];
    }

    const links: NoteLink[] = [];

    try {
      // Match internal links like [[note-id]] or [[note-id|display text]]
      const internalLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
      let internalMatch;
      
      // Reset the regex lastIndex in case the regex is reused
      internalLinkRegex.lastIndex = 0;
      
      while ((internalMatch = internalLinkRegex.exec(content)) !== null) {
        try {
          const [, noteId, displayText] = internalMatch;
          if (!noteId) continue;
          
          // Create an InternalLink
          const linkText = displayText?.trim() || noteId.trim();
          links.push({
            type: 'internal',
            id: noteId.trim(),
            text: linkText
          });
        } catch (err) {
          console.warn('Error processing internal link match:', { 
            match: internalMatch, 
            error: err instanceof Error ? err.message : String(err) 
          });
          continue;
        }
      }

      // Match external links like [text](url)
      const externalLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let externalMatch;
      
      // Reset the regex lastIndex
      externalLinkRegex.lastIndex = 0;
      
      while ((externalMatch = externalLinkRegex.exec(content)) !== null) {
        try {
          const [, text, url] = externalMatch;
          if (!text || !url) continue;
          
          // Create an ExternalLink
          links.push({
            type: 'external',
            url: url.trim(),
            text: text.trim()
          });
        } catch (err) {
          console.warn('Error processing external link match:', { 
            match: externalMatch, 
            error: err instanceof Error ? err.message : String(err) 
          });
          continue;
        }
      }
      
      console.log(`Extracted ${links.length} note links from content`);
      return links;
    } catch (err) {
      console.error('Error in extractNoteLinks:', err);
      // Don't throw, return empty array as a fallback
      return [];
    }
  }, []); // No external dependencies needed

  // Helper function to extract text from Tiptap nodes
  const extractTextFromNodes = useCallback((nodes: TiptapNode[]): string => {
    if (!Array.isArray(nodes)) return '';
    
    return nodes.map(node => {
      if ('text' in node && node.text) {
        return node.text;
      }
      if ('content' in node && Array.isArray(node.content)) {
        return extractTextFromNodes(node.content);
      }
      return '';
    }).filter(Boolean).join('\n');
  }, []);

  // Define types for Tiptap nodes and marks
  interface TiptapMark {
    type: string;
    attrs?: {
      href?: string;
      [key: string]: unknown;
    };
  }

  interface TiptapTextNode {
    type: string;
    text?: string;
    marks?: TiptapMark[];
    content?: TiptapNode[];
  }

  type TiptapNode = TiptapTextNode | { [key: string]: unknown };

  // Helper function to safely parse content
  const safeParseContent = (content: string): TiptapContent | string => {
    try {
      return JSON.parse(content);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('Failed to parse content as JSON:', errorMessage);
      return content;
    }
  };

  // Extract links from Tiptap content
  const extractLinksFromContent = useCallback((content: TiptapContent | string | null | undefined): NoteLink[] => {
    if (!content) {
      console.log('extractLinksFromContent: No content provided');
      return [];
    }
    
    // If content is a string, try to parse it as JSON first
    let parsedContent: TiptapContent | string = content;
    if (typeof content === 'string') {
      parsedContent = safeParseContent(content);
      
      // If parsing didn't return an object, use text-based extraction
      if (typeof parsedContent === 'string') {
        console.log('extractLinksFromContent: Using text-based extraction');
        const links = extractNoteLinks(parsedContent);
        console.log('extractLinksFromContent: Found links in string content:', links);
        return links;
      }
      
      console.log('extractLinksFromContent: Successfully parsed string content as JSON');
    }
    
    // At this point, content should be a TiptapContent object
    const contentObj = parsedContent as Record<string, unknown>;
    console.log('extractLinksFromContent: Parsing Tiptap content:', JSON.stringify(contentObj, null, 2));
    
    // If this is a document node with content, use that
    let nodesToProcess: TiptapNode[] = [];
    if (contentObj.type === 'doc' && Array.isArray(contentObj.content)) {
      console.log('extractLinksFromContent: Found document node with content');
      nodesToProcess = contentObj.content as TiptapNode[];
    } else if (Array.isArray(contentObj)) {
      console.log('extractLinksFromContent: Content is an array of nodes');
      nodesToProcess = contentObj as unknown as TiptapNode[];
    } else if (contentObj.content) {
      console.log('extractLinksFromContent: Found content property');
      nodesToProcess = Array.isArray(contentObj.content) 
        ? contentObj.content as TiptapNode[] 
        : [contentObj.content as TiptapNode];
    }
    
    // Handle Tiptap JSON content
    const links: NoteLink[] = [];
    
    // Type guard to check if node has marks and is a text node
    const isTextNodeWithMarks = (node: unknown): node is TiptapTextNode => {
      if (!node || typeof node !== 'object') return false;
      
      const nodeObj = node as Record<string, unknown>;
      const isTextNode = nodeObj.type === 'text';
      const hasMarks = 'marks' in nodeObj && Array.isArray(nodeObj.marks);
      
      if (hasMarks) {
        const marks = nodeObj.marks as Array<{ type?: string }>;
        const markTypes = marks
          .map(mark => mark?.type)
          .filter((type): type is string => typeof type === 'string');
        
        console.log('isTextNodeWithMarks:', { 
          isTextNode, 
          hasMarks, 
          nodeType: nodeObj.type,
          markTypes
        });
      } else {
        console.log('isTextNodeWithMarks:', { 
          isTextNode, 
          hasMarks, 
          nodeType: nodeObj.type
        });
      }
      
      return isTextNode && hasMarks;
    };
    
    // Type guard to check if mark is a link mark with href
    const isLinkMark = (mark: unknown): mark is TiptapMark & { type: 'link', attrs: { href: string } } => {
      if (!mark || typeof mark !== 'object') return false;
      
      const markObj = mark as Record<string, unknown>;
      const isLink = markObj.type === 'link';
      if (!isLink) return false;
      
      const attrs = markObj.attrs as Record<string, unknown> | undefined;
      const hasHref = !!(attrs && typeof attrs.href === 'string');
      
      console.log('isLinkMark:', { 
        isLink,
        hasAttrs: !!attrs,
        hasHref,
        href: hasHref ? (attrs as { href: string }).href : 'none'
      });
      
      return isLink && hasHref;
    };
    
    // Recursive function to traverse the Tiptap document
    const traverseNodes = (nodes: TiptapNode[] | undefined, depth = 0) => {
      const indent = '  '.repeat(depth);
      if (!Array.isArray(nodes)) {
        console.log(`${indent}traverseNodes: nodes is not an array`);
        return;
      }
      
      console.log(`${indent}traverseNodes: Processing ${nodes.length} nodes at depth ${depth}`);
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nodeInfo: Record<string, unknown> = { type: node.type };
        
        if (node && typeof node === 'object' && 'text' in node) {
          nodeInfo.text = (node as { text?: string }).text;
        }
        
        if (node && typeof node === 'object' && 'marks' in node && Array.isArray(node.marks)) {
          const marks = node.marks as Array<{ type?: string }>;
          nodeInfo.marks = marks
            .map(mark => mark?.type)
            .filter((type): type is string => typeof type === 'string');
        }
        
        console.log(`${indent}Node ${i}:`, JSON.stringify(nodeInfo, null, 2));
      
        // Handle text nodes with marks (links)
        if (isTextNodeWithMarks(node)) {
          console.log(`${indent}Found text node with marks:`, JSON.stringify(node.marks, null, 2));
          const linkMarks = (node.marks || []).filter(isLinkMark);
          
          for (const linkMark of linkMarks) {
            console.log(`${indent}Processing link mark:`, linkMark);
            const href = linkMark.attrs.href;
            const linkText = node.text || '';
            console.log(`${indent}Found link:`, { href, linkText });
            
            // Check if it's an internal link (starts with /notes/)
            const internalMatch = href.match(/^\/notes\/([a-f0-9-]+)$/);
            if (internalMatch) {
              links.push({
                type: 'internal' as const,
                id: internalMatch[1],
                text: linkText || `Link to ${internalMatch[1]}`
              });
            } else if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
              // External link
              links.push({
                type: 'external' as const,
                url: href,
                text: linkText || href
              });
            }
          }
        }
        
        // Recursively process child nodes
        if ('content' in node && Array.isArray(node.content)) {
          console.log(`${indent}Node has content, traversing children...`);
          // Only traverse once with the depth parameter
          traverseNodes(node.content, depth + 1);
        }
      }
    };
    
    // Start traversal with the processed nodes
    if (nodesToProcess.length > 0) {
      console.log(`Starting traversal of ${nodesToProcess.length} nodes`);
      traverseNodes(nodesToProcess, 0);
    } else {
      console.log('No traversable content found. Content structure:', JSON.stringify(contentObj, null, 2));
    }
    
    console.log('Finished extracting links. Found:', links);
    
    return links;
  }, [extractNoteLinks]);

  // Synchronize note links with the current content
  const syncNoteLinks = useCallback(async (noteId: string, content: TiptapContent | string | null | undefined) => {
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('Authentication required');
    }
    
    console.log('Starting syncNoteLinks for note:', noteId);
    setIsLoading(true);
    
    try {
      // 1. Get current state from the database
      const existingLinks = await getNoteLinks(noteId);
      console.log('Existing links in DB:', existingLinks);
      
      // 2. Extract links from the current content
      const currentLinks = extractLinksFromContent(content);
      console.log('Links found in content:', currentLinks);
      
      // 3. Create maps for easier comparison
      interface LinkMapValue {
        id: string;
        link_type: 'internal' | 'external';
        target_note_id?: string;
        url?: string;
        created_at: string;
        // Add text field for display purposes
        text?: string;
        // Add type field to match NoteLink type
        type?: 'internal' | 'external';
      }
      
      const existingLinkMap = new Map<string, LinkMapValue>();
      const currentLinkMap = new Map<string, LinkMapValue>();
      
      // 4. Populate the maps with existing links (from DB)
      existingLinks.forEach(link => {
        const key = link.link_type === 'internal' 
          ? `internal:${link.target_note_id}` 
          : `external:${link.url}`;
        existingLinkMap.set(key, link);
      });
      
      // 5. Populate the maps with current links (from content)
      currentLinks.forEach(link => {
        if (link.type === 'internal' && link.id === noteId) {
          console.log('Skipping self-link:', link);
          return;
        }
        
        const key = link.type === 'internal' 
          ? `internal:${link.id}` 
          : `external:${link.url}`;
          
        // Convert NoteLink to LinkMapValue
        const mapValue: LinkMapValue = {
          id: '', // This will be set when we create the link
          link_type: link.type,
          created_at: new Date().toISOString(),
          text: link.text, // Include the link text
          ...(link.type === 'internal' 
            ? { target_note_id: link.id }
            : { url: link.url })
        };
        
        currentLinkMap.set(key, mapValue);
      });
      
      // 6. Find links that need to be added (in content but not in DB)
      const linksToAdd = Array.from(currentLinkMap.entries())
        .filter(([mapKey]) => !existingLinkMap.has(mapKey))
        .map(([, link]) => link);
      
      // 7. Find links that need to be removed (in DB but not in content)
      // But be very conservative about removal
      const linksToRemove = Array.from(existingLinkMap.entries())
        .filter(([mapKey, link]) => {
          // Never remove links that were just added (within the last 30 seconds)
          const linkAge = Date.now() - new Date(link.created_at).getTime();
          if (linkAge < 30000) { // 30 seconds grace period
            console.log('Skipping recently created link from removal:', link.id);
            return false;
          }
          
          // Only remove if explicitly not in content
          return !currentLinkMap.has(mapKey);
        })
        .map(([, link]) => link);
      
      console.log('Links to add:', linksToAdd);
      console.log('Links to remove:', linksToRemove);
      
      // 8. Process additions and removals
      let addedCount = 0;
      let removedCount = 0;
      
      // Add new links first
      if (linksToAdd.length > 0) {
        console.log(`Adding ${linksToAdd.length} new links`);
        const results = await Promise.allSettled(
          linksToAdd.map(link => {
            console.log('Adding link:', link);
            if (link.link_type === 'internal' && link.target_note_id) {
              return createNoteLink(noteId, link.target_note_id, link.text || '');
            } else if (link.link_type === 'external' && link.url) {
              return createExternalLink(noteId, link.url, link.text || '');
            }
            return Promise.resolve();
          })
        );
        addedCount = results.filter(r => r.status === 'fulfilled').length;
      }
      
      // Then remove old links (if still needed)
      if (linksToRemove.length > 0) {
        console.log(`Removing ${linksToRemove.length} old links`);
        const results = await Promise.allSettled(
          linksToRemove.map(link => {
            if (link.id) {
              console.log('Removing link:', link.id);
              return deleteNoteLink(link.id);
            }
            return Promise.resolve();
          })
        );
        removedCount = results.filter(r => r.status === 'fulfilled').length;
      }
      
      const result = {
        added: addedCount,
        removed: removedCount,
        totalLinks: existingLinks.length + linksToAdd.length - linksToRemove.length
      };
      
      console.log('Sync complete:', result);
      return result;
      
    } catch (err) {
      console.error('Error in syncNoteLinks:', {
        error: err,
        noteId,
        contentType: typeof content,
        contentLength: typeof content === 'string' ? content.length : 'non-string content'
      });
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, getNoteLinks, deleteNoteLink, createNoteLink, createExternalLink, setError, extractLinksFromContent]);

  // Memoize the API to prevent unnecessary re-renders
  const api = useMemo(() => {
    const getNoteById = async (id: string) => {
      if (!user) {
        throw new Error('Authentication required');
      }
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id) // Ensure user can only access their own notes
          .single();
          
        if (error) throw error;
        return data || null;
      } catch (err) {
        const error = err as Error;
        console.error('Error fetching note:', error);
        
        if (isMounted.current) {
          setError(error);
        }
        
        throw error;
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };
    
    return {
      notes,
      isLoading,
      error,
      fetchNotes,
      createNote,
      updateNote,
      deleteNote,
      syncNoteLinks,
      createExternalLink,
      getNoteById,
      searchNotes,
      createNoteLink,
    };
  }, [
    notes,
    isLoading,
    error,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    syncNoteLinks,
    createExternalLink,
    searchNotes,
    createNoteLink,
    user,
    isMounted
  ]);

  return api;
};

export default useNotes;
