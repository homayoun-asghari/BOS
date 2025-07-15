import { useCallback, useState, useEffect } from 'react';
import { tagService } from '@/lib/supabase/services/tagService';
import { useAuth } from '@/components/auth/AuthProvider';

export const useTags = (noteId?: string) => {
  const { user } = useAuth();
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const getUserId = useCallback(() => {
    if (!user?.id) {
      throw new Error('User must be authenticated to manage tags');
    }
    return user.id;
  }, [user]);

  // Load tags for a specific note
  const loadNoteTags = useCallback(async () => {
    if (!noteId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const noteTags = await tagService.getNoteTags(noteId);
      setTags(noteTags.map(t => t.name));
    } catch (err) {
      console.error('Failed to load note tags:', err);
      setError(err instanceof Error ? err : new Error('Failed to load tags'));
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  // Add tags to a note
  const addTags = useCallback(async (tagNames: string[]) => {
    if (!noteId || tagNames.length === 0) return [];
    
    setIsLoading(true);
    setError(null);
    
    try {
      const userId = getUserId();
      await tagService.addTagsToNote(noteId, tagNames, userId);
      await loadNoteTags(); // Refresh the tags
      return tagNames;
    } catch (err) {
      console.error('Failed to add tags:', err);
      setError(err instanceof Error ? err : new Error('Failed to add tags'));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [noteId, loadNoteTags, getUserId]);

  // Remove tags from a note
  const removeTags = useCallback(async (tagNames: string[]) => {
    if (!noteId || tagNames.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const userId = getUserId();
      await tagService.removeTagsFromNote(noteId, tagNames, userId);
      setTags(prev => prev.filter(tag => !tagNames.includes(tag)));
    } catch (err) {
      console.error('Failed to remove tags:', err);
      setError(err instanceof Error ? err : new Error('Failed to remove tags'));
    } finally {
      setIsLoading(false);
    }
  }, [noteId, getUserId]);

  // Load tags when the component mounts or noteId changes
  useEffect(() => {
    if (noteId) {
      loadNoteTags();
    }
  }, [noteId, loadNoteTags]);

  return {
    tags,
    isLoading,
    error,
    addTags,
    removeTags,
    refreshTags: loadNoteTags,
  };
};

export default useTags;
