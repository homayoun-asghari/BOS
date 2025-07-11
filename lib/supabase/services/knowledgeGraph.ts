import { createClient } from '@/lib/supabase/client';

export interface KnowledgeGraphNode {
  id: string;
  title: string;
  linkTo: string[];
  referencedBy: string[];
}

export async function fetchKnowledgeGraphData(): Promise<KnowledgeGraphNode[]> {
  const supabase = createClient();
  
  // Get the current user's ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    // Fetch all notes for the current user
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('id, title')
      .eq('user_id', user.id);

    if (notesError) throw notesError;
    if (!notes) return [];

    // Fetch all internal links for the notes
    const { data: links, error: linksError } = await supabase
      .from('note_links')
      .select('note_id, target_note_id')
      .eq('link_type', 'internal')
      .in('note_id', notes.map(note => note.id));

    if (linksError) throw linksError;

    // Create a map to store the relationships
    const noteMap = new Map<string, KnowledgeGraphNode>();
    
    // Initialize all nodes with empty relationships
    notes.forEach(note => {
      noteMap.set(note.id, {
        id: note.id,
        title: note.title,
        linkTo: [],
        referencedBy: []
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
