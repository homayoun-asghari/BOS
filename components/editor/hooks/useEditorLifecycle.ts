import { useCallback, useEffect } from 'react';
import { cleanupOrphanedAttachments } from '@/lib/supabase/attachments';

interface Attachment {
  id: string;
  storage_path: string;
  file_name?: string;
  file_type?: string;
  file_size_bytes?: number;
  created_at?: string;
}

interface UseEditorLifecycleProps {
  currentNoteId?: string;
  value: string;
  onChange: (content: string) => void;
  attachments?: Attachment[];
}

/**
 * Manages the editor's lifecycle
 * - Handles initialization and cleanup
 * - Manages content state
 * - Coordinates between different editor features
 */
export const useEditorLifecycle = ({
  currentNoteId,
  value,
  onChange,
  attachments = []
}: UseEditorLifecycleProps) => {
  // Helper function to validate UUID
  const isValidUuid = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };
  
  // Extract all storage paths from the content
  const extractAttachmentUrls = useCallback((content: string): string[] => {
    if (!content) return [];
    
    console.log('[useEditorLifecycle] Extracting attachment URLs from content');
    const paths: Set<string> = new Set();
    
    // 1. First, extract all possible paths from the content using various patterns
    const patterns = [
      // Match storage paths in data-original-path attributes
      /data-original-path=['"](notes-attachments\/[^"'?]+)/g,
      // Match storage paths in data-storage-path attributes
      /data-storage-path=['"](notes-attachments\/[^"'?]+)/g,
      // Match file names in markdown image syntax
      /!\[.*?\]\([^\s]+\/([^\s)]+)\)/g,
      // Match file names in HTML img src attributes
      /<img[^>]+src=['"]([^"']+\/([^"'?]+)(?:\?[^"']*)?)['"]/gi,
      // Match file names in anchor href attributes
      /<a[^>]+href=['"]([^"']+\/([^"'?]+)(?:\?[^"']*)?)['"]/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        // The first group is typically the full match, second is the filename
        const matchGroup = match[1] || match[0];
        if (matchGroup) {
          // Extract just the filename part
          const fileName = matchGroup.split('/').pop()?.split('?')[0];
          if (fileName) {
            // Try to find the full path in the known attachments
            const matchingAttachment = attachments.find(a => 
              a.storage_path.includes(fileName) || 
              a.storage_path.endsWith(`/${fileName}`)
            );
            
            if (matchingAttachment) {
              paths.add(matchingAttachment.storage_path);
            } else if (currentNoteId) {
              // If no matching attachment found, try to construct the path
              const path = matchGroup.startsWith('notes-attachments/') 
                ? matchGroup.split('?')[0] 
                : `notes-attachments/${currentNoteId}/${fileName}`;
              paths.add(path);
            }
          }
        }
      }
    });

    // 2. Also include all attachments that are explicitly in the attachments array
    attachments.forEach(attachment => {
      if (attachment.storage_path) {
        paths.add(attachment.storage_path);
      }
    });

    console.log(`[useEditorLifecycle] Extracted ${paths.size} unique attachment paths`);
    
    // Match full URLs and extract the storage path
    const urlRegex = /https?:\/\/[^\s"']+\/storage\/v1\/object\/(?:public|sign)\/(notes-attachments\/[^\s"'?]+)/g;
    let urlMatch;
    while ((urlMatch = urlRegex.exec(content)) !== null) {
      const path = urlMatch[1].split('?')[0];
      if (path) paths.add(path);
    }
    
    // Filter and return only valid paths
    return Array.from(paths).filter((path): path is string => 
      Boolean(path && path.startsWith('notes-attachments/'))
    );
  }, [attachments, currentNoteId]);

  // Handle content updates and cleanup
  useEffect(() => {
    if (!currentNoteId || !isValidUuid(currentNoteId)) {
      console.log('[useEditorLifecycle] No valid currentNoteId, skipping cleanup');
      return;
    }

    const usedPaths = extractAttachmentUrls(value);
    console.log('[useEditorLifecycle] Starting cleanup of orphaned attachments', {
      noteId: currentNoteId,
      usedPathsCount: usedPaths.length,
      totalAttachments: attachments.length
    });

    // Clean up orphaned attachments
    const cleanup = async () => {
      try {
        await cleanupOrphanedAttachments(currentNoteId, usedPaths);
      } catch (error) {
        console.error('[useEditorLifecycle] Error cleaning up orphaned attachments:', error);
      }
    };

    // Delay cleanup to avoid race conditions with uploads
    const cleanupTimer = setTimeout(cleanup, 5000);
    return () => clearTimeout(cleanupTimer);
  }, [value, currentNoteId, extractAttachmentUrls, attachments.length]);

  // Handle initial content load
  useEffect(() => {
    if (value && currentNoteId && isValidUuid(currentNoteId)) {
      const usedPaths = extractAttachmentUrls(value);
      console.log('[useEditorLifecycle] Initial attachment check', {
        noteId: currentNoteId,
        usedPathsCount: usedPaths.length
      });
    }
  }, [currentNoteId, extractAttachmentUrls, value]);

  // Handle content updates
  const handleContentUpdate = useCallback((newContent: string) => {
    onChange(newContent);

    if (!currentNoteId || !isValidUuid(currentNoteId)) {
      return;
    }

    const usedPaths = extractAttachmentUrls(newContent);
    console.log('[useEditorLifecycle] Content updated, checking attachments', {
      noteId: currentNoteId,
      usedPathsCount: usedPaths.length
    });
  }, [currentNoteId, extractAttachmentUrls, onChange]);

  return {
    handleContentUpdate,
    extractAttachmentUrls,
    isValidUuid
  };
};
