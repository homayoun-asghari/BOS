import { useState, useCallback, useMemo } from 'react';
import { Note, NoteFormData } from '@/types/note';
import { createClient } from '@/lib/supabase/browser';
import { useUser } from './useUser';
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
    console.log(`Starting deletion of note ${id}`);

    // Step 1: Fetch all attachments related to this note
    const { data: attachments, error: fetchError } = await supabase
      .from('attachments')
      .select('id, storage_path')
      .eq('note_id', id);

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
