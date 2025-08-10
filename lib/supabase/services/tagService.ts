import { supabase } from '@/lib/supabase/client';

interface Tag {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface NoteTag {
  note_id: string;
  tag_id: string;
}

class TagService {
  private supabase = supabase;

  /**
   * Get all tags for the current user
   */
  async getUserTags(userId: string): Promise<Tag[]> {
    if (!userId) return [];

    const { data, error } = await this.supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching tags:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Ensure tags exist and return their IDs
   */
  private async ensureTags(tagNames: string[], userId: string): Promise<string[]> {
    if (tagNames.length === 0) {
      return [];
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get existing tags
    const { data: existingTags, error: fetchError } = await this.supabase
      .from('tags')
      .select('id, name')
      .in('name', tagNames)
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching existing tags:', fetchError);
      throw fetchError;
    }

    const existingTagMap = new Map(existingTags?.map(tag => [tag.name.toLowerCase(), tag.id]) || []);
    const newTags = tagNames.filter(name => !existingTagMap.has(name.toLowerCase()));

    // Insert new tags using upsert to handle race conditions
    if (newTags.length > 0) {
      const { data: insertedTags, error: insertError } = await this.supabase
        .from('tags')
        .upsert(
          newTags.map(name => ({
            name,
            user_id: userId,
            created_at: new Date().toISOString()
          })),
          { onConflict: 'user_id,name', ignoreDuplicates: true }
        )
        .select('id, name');

      if (insertError) {
        console.error('Error inserting new tags:', insertError);
        throw insertError;
      }

      // Add the newly inserted tags to our map
      insertedTags?.forEach(tag => {
        existingTagMap.set(tag.name.toLowerCase(), tag.id);
      });
    }

    // If we still don't have all tag IDs, try to fetch them one more time
    const missingTags = tagNames.filter(name => !existingTagMap.has(name.toLowerCase()));
    if (missingTags.length > 0) {
      const { data: missingTagData } = await this.supabase
        .from('tags')
        .select('id, name')
        .in('name', missingTags)
        .eq('user_id', userId);

      missingTagData?.forEach(tag => {
        existingTagMap.set(tag.name.toLowerCase(), tag.id);
      });
    }

    // Return all tag IDs we could find
    return tagNames
      .map(name => existingTagMap.get(name.toLowerCase()))
      .filter((id): id is string => id !== undefined);
  }

  /**
   * Add tags to a note
   */
  async addTagsToNote(noteId: string, tagNames: string[], userId: string): Promise<NoteTag[]> {
    if (tagNames.length === 0) {
      return [];
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    console.log('[addTagsToNote] Verifying note ownership');
    // Verify the note exists and belongs to the user
    const { data: note, error: noteError } = await this.supabase
      .from('notes')
      .select('id')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();
      
    if (noteError || !note) {
      throw new Error('Note not found or access denied');
    }
    
    const tagIds = await this.ensureTags(tagNames, userId);
    
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
  async removeTagsFromNote(noteId: string, tagNames: string[], userId: string): Promise<void> {
    if (tagNames.length === 0) return;
    
    if (!userId) throw new Error('User ID is required');

    // Get tag IDs for the given names and user
    const { data: tags } = await this.supabase
      .from('tags')
      .select('id')
      .in('name', tagNames)
      .eq('user_id', userId);

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
    try {
      // First, get the tag IDs for the note
      const { data: noteTags, error: noteTagsError } = await this.supabase
        .from('note_tags')
        .select('tag_id')
        .eq('note_id', noteId);

      if (noteTagsError) throw noteTagsError;
      if (!noteTags || noteTags.length === 0) return [];

      // Extract tag IDs
      const tagIds = noteTags.map(nt => nt.tag_id);

      // Then fetch the actual tags
      const { data: tags, error: tagsError } = await this.supabase
        .from('tags')
        .select('*')
        .in('id', tagIds);

      if (tagsError) throw tagsError;
      
      // Ensure we return an array of Tag objects
      return (tags || []) as Tag[];
    } catch (error) {
      console.error('Error fetching note tags:', error);
      return [];
    }
  }
}

export const tagService = new TagService();
