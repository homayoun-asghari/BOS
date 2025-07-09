import { cleanupOrphanedAttachments } from '../supabase/attachments';

/**
 * Extracts storage paths from editor content
 * @param content The editor content (HTML or JSON)
 * @returns Array of storage paths
 */
export const extractStoragePaths = (content: string): string[] => {
  if (!content) return [];
  
  try {
    // Handle both HTML content and JSON content
    const isJson = content.trim().startsWith('{');
    
    if (isJson) {
      // For JSON content (like Tiptap JSON)
      const json = JSON.parse(content);
      const paths: string[] = [];
      
      // Define a type for Tiptap nodes
      interface TiptapNode {
        type?: string;
        attrs?: {
          src?: string;
          [key: string]: unknown;
        };
        content?: TiptapNode[];
      }
      
      // Recursively search for storage paths in the JSON
      const findPaths = (node: TiptapNode) => {
        if (!node) return;
        
        // Check if this is an image node with storage path
        if (node.type === 'image' && node.attrs?.src) {
          paths.push(node.attrs.src);
        }
        
        // Check children
        if (node.content && Array.isArray(node.content)) {
          node.content.forEach(findPaths);
        }
      };
      
      findPaths(json);
      return paths;
    } else {
      // For HTML content, extract from data attributes
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const elements = doc.querySelectorAll('[data-storage-path]');
      return Array.from(elements).map(el => el.getAttribute('data-storage-path') || '');
    }
  } catch (error) {
    console.error('Error extracting storage paths:', error);
    return [];
  }
};

/**
 * Cleans up orphaned attachments for a note
 * @param noteId The ID of the note
 * @param content The current editor content
 * @returns Promise that resolves when cleanup is complete
 */
export const cleanupNoteAttachments = async (noteId: string, content: string): Promise<void> => {
  try {
    if (!noteId) return;
    
    // Extract storage paths from content
    const usedStoragePaths = extractStoragePaths(content);
    
    // Clean up orphaned attachments
    await cleanupOrphanedAttachments(noteId, usedStoragePaths, content);
    
  } catch (error) {
    console.error('Error cleaning up note attachments:', error);
    // Don't throw to prevent blocking the save operation
  }
};
