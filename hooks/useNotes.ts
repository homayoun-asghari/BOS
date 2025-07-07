import { useState, useCallback } from 'react';
import { Note, NoteFormData } from '@/types/note';
import { createClient } from '@/lib/supabase/browser';
import { useUser } from './useUser';

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

  // Extract links from content and return them with their types
  const extractNoteLinks = (content: string): Array<{ type: 'internal' | 'external', id?: string, url?: string, text: string }> => {
    if (!content) return [];
    
    const links: Array<{ type: 'internal' | 'external', id?: string, url?: string, text: string }> = [];
    
    // Match internal note links like [text](/notes/note-id)
    const internalRegex = /\[([^\]]+)\]\(\/notes\/([a-f0-9-]+)\)/g;
    let match;
    
    // Extract internal links
    while ((match = internalRegex.exec(content)) !== null) {
      if (match[2]) { // match[2] is the note ID
        links.push({
          type: 'internal',
          id: match[2],
          text: match[1] || 'Note Link'
        });
      }
    }
    
    // Match external links like [text](https://example.com)
    const externalRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    
    // Extract external links
    while ((match = externalRegex.exec(content)) !== null) {
      if (match[2]) { // match[2] is the URL
        // Skip internal note links that were already captured
        if (!match[2].includes('/notes/')) {
          links.push({
            type: 'external',
            url: match[2],
            text: match[1] || match[2]
          });
        }
      }
    }
    
    return links;
  };

  // Synchronize note links with the current content
  const syncNoteLinks = useCallback(async (noteId: string, content: string) => {
    try {
      console.log('Starting syncNoteLinks for note:', noteId);
      
      // Get existing links from the database
      const existingLinks = await getNoteLinks(noteId);
      console.log('Existing links from DB:', existingLinks);
      
      // Extract all links from the content
      const currentLinks = extractNoteLinks(content);
      console.log('Extracted links from content:', currentLinks);
      
      // Create a map of existing links for quick lookup
      const existingLinkMap = new Map();
      existingLinks.forEach(link => {
        if (link.link_type === 'internal') {
          existingLinkMap.set(`internal:${link.target_note_id}`, link);
        } else {
          existingLinkMap.set(`external:${link.url}`, link);
        }
      });
      
      // Find links to remove (exist in DB but not in content)
      const linksToRemove = existingLinks.filter(link => {
        if (link.link_type === 'internal') {
          return !currentLinks.some(l => l.type === 'internal' && l.id === link.target_note_id);
        } else {
          return !currentLinks.some(l => l.type === 'external' && l.url === link.url);
        }
      });
      
      console.log('Links to remove:', linksToRemove);
      
      // Find links to add (exist in content but not in DB)
      const linksToAdd = currentLinks.filter(link => {
        const key = link.type === 'internal' 
          ? `internal:${link.id}` 
          : `external:${link.url}`;
          
        // Skip if link already exists or is a self-link for internal links
        const isSelfLink = link.type === 'internal' && link.id === noteId;
        return !existingLinkMap.has(key) && !isSelfLink;
      });
      
      console.log('Links to add:', linksToAdd);
      
      // Delete removed links
      if (linksToRemove.length > 0) {
        console.log(`Removing ${linksToRemove.length} old links`);
        await Promise.all(
          linksToRemove.map(link => deleteNoteLink(link.id))
        );
      }
      
      // Add new links
      if (linksToAdd.length > 0) {
        console.log(`Adding ${linksToAdd.length} new links`);
        await Promise.all(
          linksToAdd.map(link => {
            if (link.type === 'internal') {
              console.log(`Creating internal link from ${noteId} to ${link.id}`);
              return createNoteLink(noteId, link.id!, link.text);
            } else {
              console.log(`Creating external link from ${noteId} to ${link.url}`);
              return createExternalLink(noteId, link.url!, link.text);
            }
          })
        );
      }
      
      const result = {
        removed: linksToRemove.length,
        added: linksToAdd.length
      };
      
      console.log('syncNoteLinks completed:', result);
      return result;
      
    } catch (err) {
      console.error('Error in syncNoteLinks:', {
        error: err,
        noteId,
        contentLength: content?.length
      });
      setError(err as Error);
      throw err;
    }
  }, [getNoteLinks, deleteNoteLink, createNoteLink, createExternalLink, setError]);


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
    getNoteById: useCallback(async (id: string) => {
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
    }, [supabase, setIsLoading, setError]),
    searchNotes,
    createNoteLink,
  };
};

export default useNotes;
