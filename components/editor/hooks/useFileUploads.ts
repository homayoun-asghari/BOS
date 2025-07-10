import { useCallback, useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { getSignedUrl } from '@/lib/supabase/storage-utils';

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

  const handleUpload = useCallback(async (storagePath: string, fileName: string, fileType: string, uploadId?: string, isError?: boolean) => {
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
      // For images, we'll use the storage path and let the ImageViewBlock handle the URL generation
      if (fileType.startsWith('image/')) {
        // For images, we'll use the CustomImage extension which handles the storage path
        editor.chain().focus()
          .setImage({ 
            src: storagePath, // Store the storage path, not the public URL
            alt: fileName,
            'data-original-path': storagePath, // For backward compatibility
            'data-storage-path': storagePath,  // Primary storage path reference
            'data-upload-complete': 'true'     // Mark upload as complete
          })
          .run();
      } else {
        // For other files, create a download link with a signed URL
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        const isPdf = fileExtension === 'pdf';
        
        // Get a signed URL for the file
        const signedUrl = await getSignedUrl(storagePath, { expiresIn: 3600 }) || '';
        
        editor.chain().focus()
          .insertContent({
            type: 'text',
            text: `📄 ${fileName}`,
            marks: [{
              type: 'link',
              attrs: {
                href: signedUrl || '#', // Use the signed URL if available, fallback to '#'
                'data-original-path': storagePath, // Store the storage path as a data attribute
                'data-storage-path': storagePath,  // Explicit storage path attribute
                'data-signed-url': signedUrl,      // Store the signed URL as a data attribute
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
