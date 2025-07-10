import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../database.types';

// Create a single supabase client instance
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createBrowserClient<Database>(supabaseUrl, supabaseKey);

export type LinkType = Database['public']['Enums']['link_type'];

export interface CreateLinkParams {
  noteId: string;
  linkType: LinkType;
  targetNoteId?: string;
  url?: string;
  linkText: string;
}

export interface UpdateLinkParams {
  id: string;
  linkType?: LinkType;
  targetNoteId?: string | null;
  url?: string | null;
  linkText?: string;
}

const linkService = {
  async createLink(params: CreateLinkParams) {
    const { noteId, linkType, targetNoteId, url, linkText = '' } = params;

    if (!noteId) throw new Error('noteId is required');
    if (linkType === 'internal' && !targetNoteId) throw new Error('targetNoteId is required for internal links');
    if (linkType === 'external' && !url) throw new Error('url is required for external links');

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const linkData = {
        note_id: noteId,
        link_type: linkType,
        link_text: linkText || null,
      } as const;

      const finalData = linkType === 'internal' && targetNoteId
        ? { ...linkData, target_note_id: targetNoteId }
        : { ...linkData, url };

      const { data, error } = await supabase
        .from('note_links')
        .insert(finalData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in link creation:', error);
      throw new Error(`Failed to create link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async updateLink({ id, ...updates }: UpdateLinkParams) {
    try {
      const { data, error } = await supabase
        .from('note_links')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating link:', error);
      throw new Error(`Failed to update link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async deleteLink(linkId: string) {
    try {
      const { error } = await supabase
        .from('note_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting link:', error);
      throw new Error(`Failed to delete link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getNoteLinks(noteId: string) {
    try {
      const { data, error } = await supabase
        .from('note_links')
        .select('*')
        .eq('note_id', noteId);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting note links:', error);
      throw new Error(`Failed to get note links: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getBacklinks(noteId: string) {
    try {
      const { data, error } = await supabase
        .from('note_links')
        .select('*')
        .eq('target_note_id', noteId);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting backlinks:', error);
      throw new Error(`Failed to get backlinks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getLink(linkId: string) {
    try {
      const { data, error } = await supabase
        .from('note_links')
        .select('*')
        .eq('id', linkId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting link:', error);
      throw new Error(`Failed to get link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async linkExists(noteId: string, targetNoteId: string) {
    try {
      const { data, error } = await supabase
        .from('note_links')
        .select('id')
        .eq('note_id', noteId)
        .eq('target_note_id', targetNoteId)
        .maybeSingle();

      if (error) throw error;
      return data !== null;
    } catch (error) {
      console.error('Error in linkExists:', error);
      throw new Error(`Failed to check if link exists: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};

export default linkService;
