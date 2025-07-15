import { useState, useCallback } from 'react';
import { uploadEditorFile, type UploadResult } from '@/lib/supabase/editor-uploads';
import { saveAttachment } from '@/lib/supabase/attachments';
import { useAuth } from '@/components/auth/AuthProvider';

export type { UploadResult };

export function useEditorUpload(noteId?: string) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File): Promise<UploadResult> => {
    console.log('[useEditorUpload] Starting file upload process');
    
    if (!noteId) {
      const error = new Error('Note ID is required for file uploads');
      console.error('[useEditorUpload] Validation error:', error);
      throw error;
    }
    
    if (!user?.id) {
      const error = new Error('User must be authenticated to upload files');
      console.error('[useEditorUpload] Authentication error:', error);
      throw error;
    }

    console.log('[useEditorUpload] Starting upload for file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      noteId,
      userId: user.id
    });

    setIsUploading(true);
    setUploadError(null);

    try {
      // 1. Upload file to storage
      console.log('[useEditorUpload] Calling uploadEditorFile...');
      const uploadResult = await uploadEditorFile(file, noteId, user.id);
      console.log('[useEditorUpload] File uploaded to storage:', {
        path: uploadResult.path,
        url: uploadResult.url ? 'URL generated' : 'No URL generated',
        fileName: uploadResult.fileName,
        fileType: uploadResult.fileType,
        fileSize: uploadResult.fileSize
      });
      
      // Ensure we have a valid path with extension
      if (!uploadResult.path || !uploadResult.path.includes('.')) {
        throw new Error('Invalid file path - missing file extension');
      }
      
      // 2. Save attachment metadata to database
      console.log('[useEditorUpload] Saving attachment metadata to database...');
      
      // Save the attachment metadata to the database
      await saveAttachment({
        noteId: noteId,
        userId: user.id,
        fileName: uploadResult.fileName,
        fileType: uploadResult.fileType,
        fileSize: uploadResult.fileSize,
        storagePath: uploadResult.path // Store the full storage path
      });

      console.log('[useEditorUpload] Attachment metadata saved successfully');

      // Return the complete upload result
      // The URL here is only used for the initial display
      // The image-view-block will handle generating the signed URL
      const result = {
        ...uploadResult,
        // Return the storage path as the URL - the image component will handle signing
        url: uploadResult.path,
        // Ensure we have the storage path available
        storagePath: uploadResult.path,
        // Add data attributes for the editor
        attrs: {
          'data-storage-path': uploadResult.path,
          'data-upload-complete': 'true'
        }
      };
      
      console.log('[useEditorUpload] Upload result with attrs:', {
        ...result,
        // Don't log the full URL to avoid sensitive data in logs
        url: result.url ? 'URL set' : 'No URL',
        storagePath: result.storagePath ? 'Path set' : 'No path'
      });
      
      console.log('[useEditorUpload] Upload process completed successfully');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
      console.error('Error in file upload:', error);
      setUploadError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [noteId, user?.id]);

  return {
    uploadFile,
    isUploading,
    error: uploadError,
  };
}
