import { useCallback, useState } from 'react';
import { Editor } from '@tiptap/react';

interface UseFileUploadsProps {
  editor: Editor | null;
  onFileUpload?: (storagePath: string, fileName: string, fileType: string, uploadId?: string, isError?: boolean) => void;
}

/**
 * Converts a storage path to a public URL
 * @param storagePath The storage path (e.g., 'notes-attachments/user-id/path/to/file')
 * @returns Public URL for the file
 */
const getPublicUrl = (storagePath: string): string => {
  if (!storagePath) return '';
  
  // If it's already a URL, return it as is
  if (storagePath.startsWith('http')) {
    return storagePath;
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not defined');
    return '';
  }
  
  // Extract the path after 'notes-attachments/'
  const path = storagePath.startsWith('notes-attachments/')
    ? storagePath.substring('notes-attachments/'.length)
    : storagePath;
    
  return `${supabaseUrl}/storage/v1/object/public/notes-attachments/${path}`;
};

export const useFileUploads = ({ editor, onFileUpload }: UseFileUploadsProps) => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = useCallback((storagePath: string, fileName: string, fileType: string, uploadId?: string, isError?: boolean) => {
    if (!editor) return;
    
    if (isError) {
      setUploadError(`Failed to upload ${fileName}`);
      setIsUploading(false);
      return;
    }

    // Don't show error for empty path if we have an uploadId (initial loading state)
    if (!storagePath && !uploadId) {
      console.error('No storage path provided for file upload');
      setUploadError('No storage path provided for file upload');
      return;
    }
    
    // If path is empty but we have an uploadId, it's just the initial loading state
    if (!storagePath) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    
    try {
      // Generate public URL for display
      const publicUrl = getPublicUrl(storagePath);
      
      if (fileType.startsWith('image/')) {
        // For images, we'll use the CustomImage extension which handles the storage path
        editor.chain().focus()
          .setImage({ 
            src: publicUrl, 
            alt: fileName,
            'data-original-path': storagePath, // For backward compatibility
            'data-storage-path': storagePath   // Primary storage path reference
          })
          .run();
      } else {
        // For other files, create a download link
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        const isPdf = fileExtension === 'pdf';
        
        editor.chain().focus()
          .insertContent({
            type: 'text',
            text: `📄 ${fileName}`,
            marks: [{
              type: 'link',
              attrs: {
                href: publicUrl,
                'data-original-path': storagePath, // Store the storage path as a data attribute
                'data-storage-path': storagePath,  // Explicit storage path attribute
                target: isPdf ? '_blank' : '_blank',
                rel: 'noopener noreferrer',
                class: 'inline-flex items-center text-blue-600 hover:underline',
                download: !isPdf ? fileName : undefined // Don't force download for PDFs (let browser handle them)
              }
            }]
          })
          .run();
      }
      
      if (onFileUpload) {
        onFileUpload(storagePath, fileName, fileType, uploadId, false);
      }
    } catch (error) {
      console.error('Error inserting file into editor:', error);
      setUploadError(`Failed to insert ${fileName} into editor`);
      if (onFileUpload) {
        onFileUpload('', fileName, fileType, uploadId, true);
      }
    } finally {
      setIsUploading(false);
    }
  }, [editor, onFileUpload]);

  return {
    uploadError,
    isUploading,
    handleUpload,
    setUploadError,
    setIsUploading
  };
};
