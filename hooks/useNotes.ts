import { useState, useCallback, useMemo } from 'react';
import { Note, NoteFormData } from '@/types/note';
import { createClient } from '@/lib/supabase/browser';
import { useUser } from './useUser';
import type { TiptapContent } from '@/components/editor/minimal-tiptap/hooks/use-minimal-tiptap';

// Type for Tiptap node
interface TiptapNode {
  text?: string;
  content?: TiptapNode[];
  [key: string]: unknown;
}

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

function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useUser();
  const supabase = createClient();

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  const createNote = useCallback(async (noteData: NoteFormData) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setIsLoading(true);
      const now = new Date().toISOString();
      
      // Extract the first line or first 50 characters as title if not provided
      const content = noteData.content || '';
      const title = noteData.title || content.split('\n')[0]?.trim().substring(0, 50) || 'Untitled Note';
      
      const notePayload = {
        title,
        content,
        user_id: user.id,
        created_at: now,
        updated_at: now
      };

      console.log('Creating note with data:', notePayload);
      
      const { data, error } = await supabase
        .from('notes')
        .insert(notePayload)
        .select()
        .single();
        
      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(error.message || 'Failed to create note');
      }
      
      console.log('Note created successfully:', data);
      return data;
    } catch (err) {
      console.error('Error creating note:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  const updateNote = useCallback(async (id: string, noteData: Partial<NoteFormData>) => {
    try {
      setIsLoading(true);
      const now = new Date().toISOString();
      
      // Prepare update payload with only defined fields
      const updatePayload: Partial<NoteFormData> = {
        ...noteData,
        updated_at: now
      };
      
      // If content is updated, update the title if not explicitly set
      if (noteData.content && !noteData.title) {
        const content = noteData.content || '';
        updatePayload.title = content.split('\n')[0]?.trim().substring(0, 50) || 'Untitled Note';
      }

      console.log('Updating note with data:', { id, ...updatePayload });
      
      const { data, error } = await supabase
        .from('notes')
        .update(updatePayload)
        .eq('id', id)
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
  }, [supabase]);

  const deleteNote = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting note:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Search notes using full-text search
  const searchNotes = useCallback(async (query: string) => {
    if (!user) return [];
    
    try {
      setIsLoading(true);
      
      if (!query.trim()) {
        // If query is empty, return recent notes
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(10);
          
        if (error) throw error;
        return data || [];
      }
      
      // Try full-text search first
      const { data: searchData, error: searchError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
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
        .eq('user_id', user.id)
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
  }, [user, supabase, setIsLoading, setError]);

  // Create an external link from a note to a URL
  const createExternalLink = useCallback(async (sourceNoteId: string, url: string, linkText?: string) => {
    console.log('Starting createExternalLink with:', { sourceNoteId, url, linkText });
    
    try {
      if (!user) {
        console.error('No authenticated user found');
        throw new Error('Authentication required');
      }
      
      setIsLoading(true);
      
      // Verify the source note exists and belongs to the user
      console.log('Verifying source note...');
      const { data: sourceNote, error: sourceError } = await supabase
        .from('notes')
        .select('id, title, user_id')
        .eq('id', sourceNoteId)
        .single();

      console.log('Source note query result:', { sourceNote, sourceError });

      if (sourceError || !sourceNote) {
        const error = new Error(`Source note not found: ${sourceError?.message || 'No data returned'}`);
        console.error(error);
        throw error;
      }

      if (sourceNote.user_id !== user.id) {
        const error = new Error('You do not have permission to modify this note');
        console.error(error);
        throw error;
      }

      // Prepare the data to insert
      const linkData = {
        note_id: sourceNoteId,
        link_type: 'external',
        url: url,
        link_text: linkText || url,
        created_at: new Date().toISOString()
      };
      
      console.log('Creating external link with data:', linkData);

      // Create the link in the database
      const { data, error } = await supabase
        .from('note_links')
        .insert(linkData)
        .select()
        .single();

      if (error) {
        console.error('Error creating external link:', {
          error,
          errorDetails: {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          },
          linkData
        });
        
        // Check if the error is due to RLS
        if (error.message.includes('permission denied') || error.code === '42501') {
          console.error('RLS Policy Error: The operation was blocked by Row Level Security');
        }
        
        throw new Error(`Failed to create external link: ${error.message} (Code: ${error.code})`);
      }

      console.log('External link created successfully:', data);
      return data;
    } catch (err) {
      console.error('Error in createExternalLink:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase, setError, setIsLoading]);

  // Create a link between two notes
  const createNoteLink = useCallback(async (sourceNoteId: string, targetNoteId: string, linkText?: string) => {
    console.log('Starting createNoteLink with:', { sourceNoteId, targetNoteId, linkText });
    
    try {
      if (!user) {
        console.error('No authenticated user found');
        throw new Error('Authentication required');
      }
      
      setIsLoading(true);
      
      // First, verify both notes exist and belong to the user
      console.log('Verifying source note...');
      const { data: sourceNote, error: sourceError } = await supabase
        .from('notes')
        .select('id, title, user_id')
        .eq('id', sourceNoteId)
        .single();

      console.log('Source note query result:', { sourceNote, sourceError });

      if (sourceError || !sourceNote) {
        const error = new Error(`Source note not found: ${sourceError?.message || 'No data returned'}`);
        console.error(error);
        throw error;
      }

      if (sourceNote.user_id !== user.id) {
        const error = new Error('You do not have permission to modify this note');
        console.error(error);
        throw error;
      }

      console.log('Verifying target note...');
      const { data: targetNote, error: targetError } = await supabase
        .from('notes')
        .select('id, title')
        .eq('id', targetNoteId)
        .single();

      console.log('Target note query result:', { targetNote, targetError });

      if (targetError || !targetNote) {
        const error = new Error(`Target note not found: ${targetError?.message || 'No data returned'}`);
        console.error(error);
        throw error;
      }

      // Prepare the data to insert
      const linkData = {
        note_id: sourceNoteId,
        link_type: 'internal',
        target_note_id: targetNoteId,
        url: null, // Explicitly set to null for internal links
        link_text: linkText || targetNote.title,
        created_at: new Date().toISOString()
      };
      
      console.log('Creating note link with data:', linkData);

      console.log('Attempting to insert link with data:', linkData);

      // Create the link in the database
      console.log('Attempting to insert into note_links table');
      const { data, error } = await supabase
        .from('note_links')
        .insert(linkData)
        .select()
        .single();

      if (error) {
        console.error('Error creating note link:', {
          error,
          errorDetails: {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          },
          linkData
        });
        
        // Check if the error is due to RLS
        if (error.message.includes('permission denied') || error.code === '42501') {
          console.error('RLS Policy Error: The operation was blocked by Row Level Security');
          // Check if the user has the right permissions
          const { data: userPerms } = await supabase.rpc('current_user_permissions');
          console.log('Current user permissions:', userPerms);
        }
        
        // Check if the error is due to a foreign key constraint
        if (error.code === '23503') {
          console.error('Foreign key constraint violation. Check if the referenced note exists.');
        }
        
        throw new Error(`Failed to create note link: ${error.message} (Code: ${error.code})`);
      }

      console.log('Note link created successfully:', data);
      return data;
    } catch (err) {
      console.error('Error in createNoteLink:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase, setError, setIsLoading]);

  // Get all links for a specific note
  const getNoteLinks = useCallback(async (noteId: string) => {
    try {
      const { data, error } = await supabase
        .from('note_links')
        .select('*')
        .eq('note_id', noteId);
        
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching note links:', err);
      setError(err as Error);
      throw err;
    }
  }, [supabase, setError]);

  // Delete a specific note link
  const deleteNoteLink = useCallback(async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('note_links')
        .delete()
        .eq('id', linkId);
        
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error deleting note link:', err);
      setError(err as Error);
      throw err;
    }
  }, [supabase, setError]);

  // Extract note links from markdown content
  const extractNoteLinks = useCallback((content: string): NoteLink[] => {
    if (!content) return [];

    const links: NoteLink[] = [];

    // Match internal links like [[note-id]]
    const internalLinkRegex = /\[\[([^\]]+)\]\]/g;
    let internalMatch;
    while ((internalMatch = internalLinkRegex.exec(content)) !== null) {
      const [, id] = internalMatch; // Removed unused fullMatch
      if (id) {
        links.push({
          type: 'internal',
          id: id.trim(),
          text: `[[${id.trim()}]]`,
        });
      }
    }

    // Match external links like [text](url)
    const externalLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let externalMatch;
    while ((externalMatch = externalLinkRegex.exec(content)) !== null) {
      const [, text, url] = externalMatch;
      if (text && url) {
        links.push({
          type: 'external',
          url: url.trim(),
          text: text.trim(),
        });
      }
    }

    return links;
  }, []);

  // Recursively extract text from Tiptap nodes
  const extractTextFromNodes = useCallback((nodes: TiptapNode[]): string => {
    if (!nodes || !Array.isArray(nodes)) return '';
    
    return nodes.map(node => {
      if (node.text) return node.text;
      if (node.content && Array.isArray(node.content)) {
        return extractTextFromNodes(node.content);
      }
      return '';
    }).filter(Boolean).join('\n');
  }, []);

  // Extract text from Tiptap content (handles both JSON and plain text)
  const extractTextFromContent = useCallback((content: TiptapContent | string | null | undefined): string => {
    if (!content) return '';
    
    // Handle string content (legacy)
    if (typeof content === 'string') return content;
    
    // Handle Tiptap JSON content
    if (typeof content === 'object' && 'content' in content && Array.isArray(content.content)) {
      return extractTextFromNodes(content.content);
    }
    
    return '';
  }, [extractTextFromNodes]);
  
  // Extract links from Tiptap content
  const extractLinksFromContent = useCallback((content: TiptapContent | string | null | undefined): NoteLink[] => {
    const text = extractTextFromContent(content);
    return extractNoteLinks(text);
  }, [extractTextFromContent, extractNoteLinks]);

  // Synchronize note links with the current content
  const syncNoteLinks = useCallback(async (noteId: string, content: TiptapContent | string | null | undefined) => {
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('Authentication required');
    }
    
    setIsLoading(true);
    
    try {
      // Fetch existing links for the note
      const existingLinks = await getNoteLinks(noteId);
      
      // Extract links from the content
      const currentLinks = extractLinksFromContent(content);
      
      // Create a map of existing links for quick lookup
      const existingLinkMap = new Map(
        existingLinks.map(link => [
          link.type === 'internal' ? `internal:${link.target_note_id}` : `external:${link.url}`,
          link
        ])
      );
      
      // Find links to remove (exist in DB but not in content)
      const linksToRemove = existingLinks.filter(link => {
        if (link.link_type === 'internal') {
          return !currentLinks.some(l => l.type === 'internal' && l.id === link.target_note_id);
        } else {
          return !currentLinks.some(l => l.type === 'external' && l.url === link.url);
        }
      });
      
      // Find links to add (exist in content but not in DB)
      const linksToAdd = currentLinks.filter(link => {
        const key = link.type === 'internal' 
          ? `internal:${link.id}` 
          : `external:${link.url}`;
          
        // Skip if link already exists or is a self-link for internal links
        const isSelfLink = link.type === 'internal' && link.id === noteId;
        return !existingLinkMap.has(key) && !isSelfLink;
      });
      
      // Delete removed links
      if (linksToRemove.length > 0) {
        await Promise.all(
          linksToRemove.map(link => deleteNoteLink(link.id))
        );
      }
      
      // Add new links
      if (linksToAdd.length > 0) {
        await Promise.all(
          linksToAdd.map(link => {
            if (link.type === 'internal') {
              return createNoteLink(noteId, link.id, link.text);
            } else {
              return createExternalLink(noteId, link.url, link.text);
            }
          })
        );
      }
      
      return {
        removed: linksToRemove.length,
        added: linksToAdd.length
      };
      
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
  const api = useMemo(() => ({
    notes,
    isLoading,
    error,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    syncNoteLinks,
    createExternalLink,
    getNoteById: async (id: string) => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        return data || null;
      } catch (err) {
        console.error('Error fetching note:', err);
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    searchNotes,
    createNoteLink,
  }), [
    notes,
    isLoading,
    error,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    syncNoteLinks,
    createExternalLink,
    supabase,
    setIsLoading,
    setError,
    searchNotes,
    createNoteLink
  ]);
  
  return api;
};

export default useNotes;
