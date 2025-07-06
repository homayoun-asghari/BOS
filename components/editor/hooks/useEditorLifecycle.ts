import { useCallback, useEffect } from 'react';
import { cleanupOrphanedAttachments } from '@/lib/supabase/attachments';

/**
 * Manages the editor's lifecycle
 * - Handles initialization and cleanup
 * - Manages content state
 * - Coordinates between different editor features
 */

export const useEditorLifecycle = ({
  currentNoteId,
  value,
  onChange
}: {
  currentNoteId?: string;
  value: string;
  onChange: (content: string) => void;
}) => {
  // Helper function to validate UUID
  const isValidUuid = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };
  
  // Extract all storage paths from the content
  const extractAttachmentUrls = useCallback((content: string): string[] => {
    if (!content) return [];
    
    const paths: Set<string> = new Set();
    let match;
    
    // Match storage paths directly in data-original-path attributes
    const dataPathRegex = /data-original-path=["'](notes-attachments\/[^"']+)["']/g;
    while ((match = dataPathRegex.exec(content)) !== null) {
      paths.add(match[1]);
    }
    
    // Match storage paths in src attributes (for backward compatibility)
    const srcPathRegex = /src=["'](?:[^"']*\/)?(notes-attachments\/[^"'?]+)/g;
    while ((match = srcPathRegex.exec(content)) !== null) {
      paths.add(match[1]);
    }
    
    // Match full storage paths in content
    const storagePathRegex = /(notes-attachments\/[\w-]+\/[\w\-\.\/]+)/g;
    while ((match = storagePathRegex.exec(content)) !== null) {
      paths.add(match[1]);
    }
    
    // Match full URLs and extract the storage path
    const urlRegex = /https?:\/\/[^\s"']+\/storage\/v1\/object\/(?:public|sign)\/(notes-attachments\/[^\s"'?]+)/g;
    while ((match = urlRegex.exec(content)) !== null) {
      paths.add(match[1]);
    }
    
    // Filter out any invalid paths
    const validPaths = Array.from(paths).filter(path => 
      path.startsWith('notes-attachments/') && path.split('/').length >= 3
    );
    
    return validPaths;
  }, []);
  
  // Function to handle content updates and trigger cleanup
  const handleContentUpdate = useCallback((content: string) => {
    if (onChange) {
      onChange(content);
      
      // Only attempt cleanup if we have a valid note ID
      if (currentNoteId && isValidUuid(currentNoteId)) {
        // Use a small delay to ensure the content is fully updated
        const cleanupTimer = setTimeout(() => {
          try {
            const usedUrls = extractAttachmentUrls(content);
            console.log('Current attachment URLs in content:', usedUrls);
            
            cleanupOrphanedAttachments(currentNoteId, usedUrls)
              .then(({ deleted, failed }) => {
                if (deleted > 0) {
                  console.log(`Cleaned up ${deleted} orphaned attachments`);
                }
                if (failed > 0) {
                  console.warn(`Failed to clean up ${failed} attachments`);
                }
              })
              .catch(error => {
                // Don't log errors for invalid UUIDs as they're expected during note creation
                if (!error.message?.includes('invalid input syntax for type uuid')) {
                  console.error('Error cleaning up orphaned attachments:', error);
                }
              });
          } catch (error) {
            console.error('Error in attachment cleanup process:', error);
          }
        }, 500); // Small delay to ensure content is updated
        
        return () => clearTimeout(cleanupTimer);
      }
    }
  }, [onChange, currentNoteId, extractAttachmentUrls]);

  // Clean up when the component unmounts or when content changes
  useEffect(() => {
    return () => {
      if (currentNoteId && isValidUuid(currentNoteId)) {
        const usedUrls = extractAttachmentUrls(value);
        cleanupOrphanedAttachments(currentNoteId, usedUrls)
          .then(({ deleted }) => {
            if (deleted > 0) {
              console.log(`Cleaned up ${deleted} orphaned attachments on unmount`);
            }
          })
          .catch(console.error);
      }
    };
  }, [currentNoteId, value, extractAttachmentUrls]);

  return {
    handleContentUpdate,
    extractAttachmentUrls,
    isValidUuid
  };
};
