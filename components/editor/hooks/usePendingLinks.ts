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
      console.log('No pending links to process');
      return { success: 0, failed: 0 };
    }
    
    console.log(`Processing ${pendingLinks.current.length} pending links for note ${noteId}`);
    
    const successfulLinks = [];
    const failedLinks = [];
    
    // Process each pending link
    for (const [index, link] of pendingLinks.current.entries()) {
      console.log(`Processing link ${index + 1}/${pendingLinks.current.length}:`, {
        sourceNoteId: noteId,
        targetNoteId: link.targetNoteId,
        linkText: link.linkText
      });
      
      try {
        // Skip if source and target are the same
        if (noteId === link.targetNoteId) {
          console.warn('Skipping self-referential link');
          continue;
        }
        
        await createNoteLink(noteId, link.targetNoteId, link.linkText);
        console.log('Successfully created link');
        successfulLinks.push(link);
      } catch (error) {
        console.error('Failed to create pending link:', {
          error,
          sourceNoteId: noteId,
          targetNoteId: link.targetNoteId,
          linkText: link.linkText
        });
        
        // Only keep the link in failedLinks if it's a non-duplicate error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('duplicate')) {
          failedLinks.push(link);
        } else {
          console.log('Skipping duplicate link');
        }
      }
    }
    
    // Update pending links with only the failed ones
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
