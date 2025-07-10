import { useCallback, useState, useEffect } from 'react';
import { tagService } from '@/lib/supabase/services/tagService';

export const useTags = (noteId?: string) => {
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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
      await tagService.addTagsToNote(noteId, tagNames);
      await loadNoteTags(); // Refresh the tags
      return tagNames;
    } catch (err) {
      console.error('Failed to add tags:', err);
      setError(err instanceof Error ? err : new Error('Failed to add tags'));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [noteId, loadNoteTags]);

  // Remove tags from a note
  const removeTags = useCallback(async (tagNames: string[]) => {
    if (!noteId || tagNames.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await tagService.removeTagsFromNote(noteId, tagNames);
      setTags(prev => prev.filter(tag => !tagNames.includes(tag)));
    } catch (err) {
      console.error('Failed to remove tags:', err);
      setError(err instanceof Error ? err : new Error('Failed to remove tags'));
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

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
