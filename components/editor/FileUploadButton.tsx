'use client';

import { Button } from '@/components/ui/button';
import { File, Image as ImageIcon } from 'lucide-react';
import { useCallback, ChangeEvent, useId } from 'react';
import { uploadFile } from '@/lib/supabase/storage';
import { saveAttachment } from '@/lib/supabase/attachments';
import { useAuth } from '@/components/auth/AuthProvider';

export interface FileUploadButtonProps {
  onUpload: (fileUrl: string, fileName: string, fileType: string, uploadId?: string, isError?: boolean) => void;
  noteId?: string; // Add noteId to save attachments to the database
  accept?: string;
  multiple?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  title?: string;
  'aria-label'?: string;
}

export function FileUploadButton({
  onUpload,
  noteId,
  accept = '*/*',
  multiple = false,
  variant = 'outline',
  size = 'icon',
  className = '',
  children,
  title = 'Upload file',
  'aria-label': ariaLabel = 'Upload file'
}: FileUploadButtonProps) {
  const inputId = useId();
  const { user } = useAuth();

  const handleFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate noteId is a valid UUID if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (noteId && !uuidRegex.test(noteId)) {
      console.error('Invalid noteId format. Must be a valid UUID.');
      return;
    }

    try {
      Array.from(files).forEach((file) => {
        // 1. Show a loading state or placeholder in the editor
        const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        onUpload('', file.name, file.type, uploadId, false);
        
        // 2. Start the upload
        console.log('Starting file upload...');
        uploadFile(file, 'attachments')
          .then(async (uploadResponse) => {
            console.log('Upload completed:', {
              fileName: file.name,
              storagePath: uploadResponse.storagePath,
              fileType: uploadResponse.fileType,
              fileSize: uploadResponse.fileSize,
              path: uploadResponse.path
            });
            
            if (!uploadResponse.storagePath) {
              const error = new Error('No storage path returned from upload');
              console.error('Upload error:', error);
              onUpload('', file.name, file.type, uploadId, true);
              return;
            }
            
            // 3. Save attachment to database if we have a noteId and user
            if (noteId && user?.id) {
              try {
                console.log('Upload response from storage:', uploadResponse);
                
                // Use the storagePath from the upload response
                const storagePath = uploadResponse.storagePath || `notes-attachments/${uploadResponse.path}`;
                
                const attachmentData = {
                  noteId,
                  userId: user.id,
                  fileName: uploadResponse.fileName || file.name,
                  fileType: uploadResponse.fileType || file.type,
                  fileSize: uploadResponse.fileSize || file.size,
                  storagePath: storagePath
                };
                
                console.log('Saving attachment with data:', {
                  ...attachmentData,
                  // Don't log the full storage path as it might be sensitive
                  storagePath: storagePath.length > 50 
                    ? `${storagePath.substring(0, 25)}...${storagePath.substring(storagePath.length - 25)}` 
                    : storagePath
                });
                
                try {
                  console.log('Attempting to save attachment to database...');
                  const result = await saveAttachment(attachmentData);
                  
                  console.log('✅ Attachment saved to database:', {
                    id: result.id,
                    note_id: result.note_id,
                    file_name: result.file_name,
                    // Don't log the full storage path as it might be sensitive
                    storage_path: result.storage_path.length > 50 
                      ? `${result.storage_path.substring(0, 25)}...${result.storage_path.substring(result.storage_path.length - 25)}` 
                      : result.storage_path
                  });
                  
                  // Update the editor with the storage path
                  onUpload(storagePath, file.name, file.type, uploadId, false);
                  
                } catch (dbError) {
                  const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';
                  console.error('❌ Error saving attachment to database:', errorMessage);
                  
                  // Still update the editor with the file, but mark it as having an error
                  onUpload(storagePath, file.name, file.type, uploadId, true);
                }
              } catch (error) {
                console.error('Error in attachment handling:', error);
                onUpload('', file.name, file.type, uploadId, true);
              }
            } else {
              // If we don't have a noteId or user, just update the editor with the file
              onUpload(uploadResponse.storagePath, file.name, file.type, uploadId, false);
            }
            
            console.log('File processed successfully:', {
              type: file.type,
              name: file.name,
              hasNoteId: !!noteId,
              hasUserId: !!user?.id
            });
          })
          .catch((error) => {
            console.error('Background upload failed:', error);
            onUpload('', file.name, file.type, uploadId, true);
          });
      });
      
      // Reset the input to allow re-uploading the same file
      e.target.value = '';
    } catch (error) {
      console.error('Error handling file upload:', error);
      // Show error in the UI for each file
      Array.from(files).forEach((file) => {
        const uploadId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        onUpload('', file.name, file.type, uploadId, true);
      });
    }
  }, [onUpload, noteId, user?.id]);

  const getIcon = () => {
    if (accept?.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return children || <File className="h-4 w-4" />;
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => document.getElementById(inputId)?.click()}
        className="relative"
        aria-label={ariaLabel}
        title={title}
      >
        {getIcon()}
      </Button>
      <input
        id={inputId}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
      />
    </div>
  );
}
