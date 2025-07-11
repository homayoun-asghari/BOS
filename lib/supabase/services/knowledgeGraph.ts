import { createClient } from '@/lib/supabase/client';

// Define our types
type Tag = {
  id: string;
  name: string;
};

export interface KnowledgeGraphNode {
  id: string;
  title: string;
  linkTo: string[];
  referencedBy: string[];
  tags?: Tag[];
  content_search?: string;
}

export async function fetchKnowledgeGraphData(): Promise<KnowledgeGraphNode[]> {
  const supabase = createClient();
  
  // Get the current user's ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    // First, fetch all notes for the current user
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('id, title, content_search')
      .eq('user_id', user.id);

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
    
    // Initialize all nodes with their data
    notes.forEach(note => {
      noteMap.set(note.id, {
        id: note.id,
        title: note.title,
        linkTo: [],
        referencedBy: [],
        tags: tagsByNoteId.get(note.id) || [],
        content_search: note.content_search
      });
    });

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
