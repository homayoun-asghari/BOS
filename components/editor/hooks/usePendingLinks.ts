import { useCallback, useRef } from 'react';

interface PendingLink {
  targetNoteId: string;
  linkText: string;
}

type CreateNoteLinkFn = (sourceNoteId: string, targetNoteId: string, linkText?: string) => Promise<unknown>;

interface UsePendingLinksProps {
  createNoteLink: CreateNoteLinkFn;
}

export const usePendingLinks = ({ createNoteLink }: UsePendingLinksProps) => {
  const pendingLinks = useRef<PendingLink[]>([]);

  const processPendingLinks = useCallback(async (noteId: string) => {
    if (!pendingLinks.current.length) {
      return { success: 0, failed: 0 };
    }
    
    console.log(`Processing ${pendingLinks.current.length} pending links for note ${noteId}`);
    
    const successfulLinks = [];
    const failedLinks = [];
    
    // Process each pending link
    for (const link of pendingLinks.current) {
      try {
        console.log('Creating pending link:', { sourceNoteId: noteId, targetNoteId: link.targetNoteId });
        await createNoteLink(noteId, link.targetNoteId, link.linkText);
        successfulLinks.push(link);
      } catch (error) {
        console.error('Failed to create pending link:', error);
        failedLinks.push(link);
      }
    }
    
    // Remove successfully created links from pending
    pendingLinks.current = failedLinks;
    
    console.log(`Processed pending links: ${successfulLinks.length} succeeded, ${failedLinks.length} failed`);
    
    return {
      success: successfulLinks.length,
      failed: failedLinks.length
    };
  }, [createNoteLink]);

  const addPendingLink = (targetNoteId: string, linkText: string) => {
    pendingLinks.current.push({ targetNoteId, linkText });
  };

  const hasPendingLinks = () => pendingLinks.current.length > 0;

  return {
    pendingLinks,
    processPendingLinks,
    addPendingLink,
    hasPendingLinks
  };
};
