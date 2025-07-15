import { supabase } from './client';
import type { NoteWithTags } from '@/types/note';

export async function fetchNotesWithTags(userId: string): Promise<NoteWithTags[]> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // Fetch notes with their tags in a single query using a join
    const { data, error } = await supabase
      .from('notes')
      .select(`
        id,
        user_id,
        title,
        content,
        created_at,
        updated_at,
        is_pinned,
        content_search,
        tags (
          id,
          name,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error.message);
      throw new Error(`Failed to fetch notes: ${error.message}`);
    }

    if (!data) {
      console.error('No data returned from Supabase');
      throw new Error('No data returned from Supabase');
    }

    // Handle null values and ensure proper typing
    const transformedData = data.map(note => ({
      id: note.id,
      user_id: note.user_id,
      title: note.title || 'Untitled',
      content: note.content || {},
      created_at: note.created_at,
      updated_at: note.updated_at,
      is_pinned: note.is_pinned,
      content_search: note.content_search || '',
      tags: note.tags || [],
      pinned: note.is_pinned
    })) as NoteWithTags[];

    return transformedData;
  } catch (err) {
    console.error('Error in fetchNotesWithTags:', err);
    throw new Error(`Failed to fetch notes: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

export async function toggleNotePin(noteId: string, userId: string, pinned: boolean) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const { data, error } = await supabase
    .from('notes')
    .update({ is_pinned: pinned, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error toggling pin status:', error);
    throw error;
  }

  return data;
}

export async function deleteNote(noteId: string, userId: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
  return { success: true };
}
