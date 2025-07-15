import { useState, useEffect } from 'react';
import { tagService } from '@/lib/supabase/services/tagService';

export const useTagSuggestions = (inputValue: string, userId?: string) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!inputValue || inputValue.trim().length < 1) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (!userId) {
          setSuggestions([]);
          return;
        }
        const userTags = await tagService.getUserTags(userId);
        const searchTerm = inputValue.toLowerCase().replace(/^#/, '');
        
        const matchedTags = userTags
          .map(tag => tag.name)
          .filter(tag => tag.toLowerCase().startsWith(searchTerm))
          .sort((a, b) => {
            // Sort exact matches to the top, then alphabetically
            if (a.toLowerCase() === searchTerm) return -1;
            if (b.toLowerCase() === searchTerm) return 1;
            return a.localeCompare(b);
          })
          .slice(0, 5); // Limit to 5 suggestions

        setSuggestions(matchedTags);
      } catch (err) {
        console.error('Error fetching tag suggestions:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch suggestions'));
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounceTimer);
  }, [inputValue, userId]);

  return { suggestions, isLoading, error };
};
