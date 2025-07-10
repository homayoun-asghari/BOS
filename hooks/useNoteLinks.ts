import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import linkService, { CreateLinkParams, UpdateLinkParams } from '@/lib/supabase/services/linkService';

export const useNoteLinks = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);


  const createLink = useCallback(async (params: CreateLinkParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For internal links, check if the link already exists
      if (params.linkType === 'internal' && params.targetNoteId) {
        const exists = await linkService.linkExists(params.noteId, params.targetNoteId);
        if (exists) {
          toast('Link exists', {
            description: 'This note is already linked to the target note.'
          });
          return null;
        }
      }

      const link = await linkService.createLink(params);
      toast('Link created', {
        description: 'The link has been successfully created.'
      });
      return link;
    } catch (err) {
      const error = err as Error;
      console.error('Error creating link:', error);
      setError(error);
      toast.error('Error creating link', {
        description: error.message || 'An error occurred while creating the link.',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateLink = useCallback(async (params: UpdateLinkParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedLink = await linkService.updateLink(params);
      toast('Link updated', {
        description: 'The link has been successfully updated.'
      });
      return updatedLink;
    } catch (err) {
      const error = err as Error;
      console.error('Error updating link:', error);
      setError(error);
      toast.error('Error updating link', {
        description: error.message || 'An error occurred while updating the link.',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const deleteLink = useCallback(async (linkId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await linkService.deleteLink(linkId);
      toast('Link deleted', {
        description: 'The link has been successfully deleted.'
      });
      return true;
    } catch (err) {
      const error = err as Error;
      console.error('Error deleting link:', error);
      setError(error);
      toast.error('Error deleting link', {
        description: error.message || 'An error occurred while deleting the link.',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const getNoteLinks = useCallback(async (noteId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      return await linkService.getNoteLinks(noteId);
    } catch (err) {
      const error = err as Error;
      console.error('Error fetching note links:', error);
      setError(error);
      toast.error('Error fetching links', {
        description: error.message || 'An error occurred while fetching links.',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const getBacklinks = useCallback(async (noteId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      return await linkService.getBacklinks(noteId);
    } catch (err) {
      const error = err as Error;
      console.error('Error fetching backlinks:', error);
      setError(error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createLink,
    updateLink,
    deleteLink,
    getNoteLinks,
    getBacklinks,
    isLoading,
    error,
  };
};

export default useNoteLinks;
