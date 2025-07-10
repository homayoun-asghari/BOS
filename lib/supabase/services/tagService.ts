import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';

type Tag = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

type NoteTag = {
  note_id: string;
  tag_id: string;
};

class TagService {
  private supabase = createClient();

  /**
   * Get all tags for the current user
   */
  async getUserTags(): Promise<Tag[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      return [];
    }

    return data || [];
  }

  /**
   * Ensure tags exist and return their IDs
   */
  private async ensureTags(tagNames: string[]): Promise<string[]> {
    if (tagNames.length === 0) {
      return [];
    }
    
    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if (!user || authError) {
      throw new Error('User not authenticated');
    }

    // Get existing tags
    const { data: existingTags, error: fetchError } = await this.supabase
      .from('tags')
      .select('id, name')
      .in('name', tagNames)
      .eq('user_id', user.id);

    if (fetchError) {
      throw fetchError;
    }

    const existingTagNames = new Set(existingTags?.map(t => t.name) || []);
    const newTags = tagNames.filter(name => !existingTagNames.has(name));

    // Insert new tags one by one to handle potential race conditions
    const insertedTagIds: string[] = [];
    
    for (const name of newTags) {
      const { data: insertedTag, error } = await this.supabase
        .from('tags')
        .insert({
          name,
          user_id: user.id,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        continue; // Skip this tag but continue with others
      }

      if (insertedTag) {
        insertedTagIds.push(insertedTag.id);
      }
    }

    // Combine existing and new tags
    return [
      ...(existingTags?.map(t => t.id) || []),
      ...insertedTagIds
    ];
  }

  /**
   * Add tags to a note
   */
  async addTagsToNote(noteId: string, tagNames: string[]): Promise<NoteTag[]> {
    if (tagNames.length === 0) {
      return [];
    }
    
    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if (!user || authError) {
      throw new Error('User not authenticated');
    }
    
    console.log('[addTagsToNote] Verifying note ownership');
    // Verify the note exists and belongs to the user
    const { data: note, error: noteError } = await this.supabase
      .from('notes')
      .select('id')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();
      
    if (noteError || !note) {
      throw new Error('Note not found or access denied');
    }
    
    const tagIds = await this.ensureTags(tagNames);
    
    if (tagIds.length === 0) {
      return [];
    }
    
    // Get existing note_tags to prevent duplicates
    const { data: existingNoteTags, error: fetchError } = await this.supabase
      .from('note_tags')
      .select('tag_id')
      .eq('note_id', noteId)
      .in('tag_id', tagIds);

    if (fetchError) {
      throw fetchError;
    }

    const existingTagIds = new Set(existingNoteTags?.map(nt => nt.tag_id) || []);
    const newNoteTags = tagIds
      .filter(id => !existingTagIds.has(id))
      .map(tagId => ({
        note_id: noteId,
        tag_id: tagId
      }));

    if (newNoteTags.length === 0) {
      return [];
    }

    // Insert the new note-tag relationships
    // Use upsert with onConflict to handle potential race conditions
    const { data, error } = await this.supabase
      .from('note_tags')
      .upsert(newNoteTags, {
        onConflict: 'note_id,tag_id',
        ignoreDuplicates: true
      })
      .select();

    if (error) {
      console.error('Error adding tags to note:', error);
      // If it's a duplicate key error, just return the existing relationships
      if (error.code === '23505') { // unique_violation
        const { data: existing } = await this.supabase
          .from('note_tags')
          .select()
          .eq('note_id', noteId)
          .in('tag_id', tagIds);
        return existing || [];
      }
      throw error;
    }

    return data as NoteTag[];
  }

  /**
   * Remove tags from a note
   */
  async removeTagsFromNote(noteId: string, tagNames: string[]): Promise<void> {
    if (tagNames.length === 0) return;
    
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get tag IDs for the given names and user
    const { data: tags } = await this.supabase
      .from('tags')
      .select('id')
      .in('name', tagNames)
      .eq('user_id', user.id);

    if (!tags || tags.length === 0) return;

    const tagIds = tags.map(t => t.id);
    
    const { error } = await this.supabase
      .from('note_tags')
      .delete()
      .eq('note_id', noteId)
      .in('tag_id', tagIds);

    if (error) {
      console.error('Error removing tags from note:', error);
      throw error;
    }
  }

  /**
   * Get all tags for a specific note
   */
  async getNoteTags(noteId: string): Promise<Tag[]> {
    const { data, error } = await this.supabase
      .from('note_tags')
      .select(`
        tag:tags!inner(*)
      `)
      .eq('note_id', noteId);

    if (error) {
      console.error('Error fetching note tags:', error);
      return [];
    }

    return data.map(({ tag }) => tag as Tag);
  }
}

export const tagService = new TagService();
