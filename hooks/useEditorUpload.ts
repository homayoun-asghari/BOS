import { useState, useCallback } from 'react';
import { uploadEditorFile, type UploadResult } from '@/lib/supabase/editor-uploads';
import { saveAttachment } from '@/lib/supabase/attachments';
import { useUser } from './useUser';

export type { UploadResult };

export function useEditorUpload(noteId?: string) {
  const { user } = useUser();
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
        url: uploadResult.url,
        publicUrl: uploadResult.url
      });
      
      // 2. Save attachment metadata to database
      console.log('[useEditorUpload] Saving attachment metadata to database...');
      
      // Save the attachment metadata to the database - use the storage path, not the URL
      await saveAttachment({
        noteId: noteId,
        userId: user.id,
        fileName: uploadResult.fileName,
        fileType: uploadResult.fileType,
        fileSize: uploadResult.fileSize,
        storagePath: uploadResult.path // This is just the path, not a full URL
      });

      console.log('[useEditorUpload] Attachment metadata saved successfully');

      // Return the complete upload result including the URL
      const result = {
        ...uploadResult,
        url: uploadResult.url // Ensure we have a public URL for the editor to use
      };
      
      console.log('[useEditorUpload] Upload process completed successfully:', result);
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
