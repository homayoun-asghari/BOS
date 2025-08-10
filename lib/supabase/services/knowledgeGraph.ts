import { supabase } from '@/lib/supabase/client';

// Define our types
type Tag = {
  id: string;
  name: string;
};

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  title?: string;
  type: 'note' | 'tag' | 'link';
  x: number;
  y: number;
  size: number;
  color: string;
  linkTo: string[];
  referencedBy: string[];
  tags?: Tag[];
  content_search?: string;
  // Add other known properties here
  [key: string]: unknown; // For any additional properties that might be added dynamically
}

export async function fetchKnowledgeGraphData(userId: string): Promise<KnowledgeGraphNode[]> {
  if (!userId) return [];

  try {
    // First, fetch all notes for the current user
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('id, title, content_search')
      .eq('user_id', userId);

    if (notesError) throw notesError;
    if (!notes?.length) return [];

    // Then fetch all tags for these notes
    const { data: noteTags, error: tagsError } = await supabase
      .from('note_tags')
      .select('note_id, tags(id, name)')
      .in('note_id', notes.map(n => n.id));

    if (tagsError) throw tagsError;

    // Create a map of note_id to its tags
    const tagsByNoteId = new Map<string, Tag[]>();
    
    // Process tags and group by note_id
    if (noteTags && Array.isArray(noteTags)) {
      noteTags.forEach(item => {
        if (!item) return;
        const noteId = item.note_id;
        const tags = Array.isArray(item.tags) ? item.tags : [item.tags];
        
        tags.forEach(tag => {
          if (tag && tag.id && tag.name) {
            const currentTags = tagsByNoteId.get(noteId) || [];
            tagsByNoteId.set(noteId, [...currentTags, tag]);
          }
        });
      });
    }

    // Fetch all internal links for the notes
    const { data: links, error: linksError } = await supabase
      .from('note_links')
      .select('note_id, target_note_id')
      .eq('link_type', 'internal')
      .in('note_id', notes.map(note => note.id));

    if (linksError) throw linksError;

    // Create a map to store the relationships
    const noteMap = new Map<string, KnowledgeGraphNode>();
    
    // Create nodes for each note
    const noteNodes = notes.map(note => ({
      id: note.id,
      label: note.title || 'Untitled',
      type: 'note' as const,
      title: note.title,
      linkTo: [],
      referencedBy: [],
      tags: tagsByNoteId.get(note.id) || [],
      content_search: note.content_search,
      x: 0,
      y: 0,
      size: 1,
      color: '#4f46e5' // Default color
    }));

    // Add nodes to the map
    noteNodes.forEach(node => noteMap.set(node.id, node));

    // Process the links to build the relationships
    links?.forEach(link => {
      const sourceNode = noteMap.get(link.note_id);
      const targetNode = noteMap.get(link.target_note_id);

      if (sourceNode && targetNode) {
        // Add forward link (note -> target_note)
        if (!sourceNode.linkTo.includes(link.target_note_id)) {
          sourceNode.linkTo.push(link.target_note_id);
        }
        
        // Add reverse link (target_note is referenced by note)
        if (!targetNode.referencedBy.includes(link.note_id)) {
          targetNode.referencedBy.push(link.note_id);
        }
      }
    });

    // Convert the map to an array and return
    return Array.from(noteMap.values());
  } catch (error) {
    console.error('Error fetching knowledge graph data:', error);
    return [];
  }
}
