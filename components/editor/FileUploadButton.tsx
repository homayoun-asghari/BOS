'use client';

import { Button } from '@/components/ui/button';
import { File, Image as ImageIcon } from 'lucide-react';
import { useCallback, ChangeEvent, useId } from 'react';
import { uploadFile } from '@/lib/supabase/storage';
import { getSecureFileUrl } from '@/utils/secureFileUrl';
import { saveAttachment } from '@/lib/supabase/attachments';
import { useUser } from '@/hooks/useUser';

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
  const { user } = useUser();

  const handleFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      Array.from(files).forEach((file) => {
        // 1. Show a loading state or placeholder in the editor
        const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        onUpload('', file.name, file.type, uploadId, false);
        
        // 2. Start the upload
        uploadFile(file, 'attachments')
          .then(async (uploadResponse) => {
            console.log('Upload completed:', uploadResponse);
            
            // 3. Get the public URL
            let publicUrl = uploadResponse.publicUrl;
            if (!publicUrl) {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
              if (!supabaseUrl) {
                throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
              }
              publicUrl = `${supabaseUrl}/storage/v1/object/public/notes-attachments/${uploadResponse.path}`;
            } else if (!publicUrl.startsWith('http')) {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
              publicUrl = `${supabaseUrl}${publicUrl.startsWith('/') ? '' : '/'}${publicUrl}`;
            }
            
            // 4. Get secure signed URL and update the editor
            console.log('Generating secure URL for:', publicUrl);
            
            try {
              // First try to get a secure URL
              const secureUrl = await getSecureFileUrl(publicUrl);
              console.log('Generated secure URL:', secureUrl);
              
              // 5. Save attachment to database if we have a noteId and user
              if (noteId && user?.id) {
                try {
                  console.log('Upload response from storage:', {
                    path: uploadResponse.path,
                    fullResponse: uploadResponse
                  });
                  
                  if (!uploadResponse.path) {
                    throw new Error('No path returned from storage upload');
                  }

                  const attachmentData = {
                    noteId,
                    userId: user.id,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    storagePath: uploadResponse.path
                  };
                  
                  console.log('Saving attachment with data:', attachmentData);
                  
                  try {
                    const result = await saveAttachment(attachmentData);
                    if (result === null) {
                      console.log('Attachment not saved to database - no valid noteId');
                    } else {
                      console.log('Attachment saved to database:', result);
                    }
                  } catch (dbError) {
                    console.error('Error saving attachment to database:', {
                      error: dbError,
                      noteId,
                      userId: user?.id,
                      fileName: file.name,
                      fileSize: file.size,
                      storagePath: uploadResponse?.path
                    });
                    // Continue even if database save fails - we still want to show the file
                  }
                } catch (error) {
                  console.error('Error in attachment handling:', error);
                  // Continue with the upload even if there was an error
                }
              }
              
              // 6. Update the editor with the secure URL
              onUpload(secureUrl, file.name, file.type, uploadId, false);
              
              console.log('File type:', file.type);
              console.log('File name:', file.name);
              console.log('Secure URL generated successfully');
            } catch (error) {
              console.error('Error generating secure URL:', error);
              // Fall back to public URL if secure URL generation fails
              onUpload(publicUrl, file.name, file.type, uploadId, false);
            } finally {
              console.groupEnd();
            }
          })
          .catch((error) => {
            console.error('Background upload failed:', error);
            onUpload('', file.name, file.type, uploadId, true);
          });
      });
      
      // 5. Reset the input to allow re-uploading the same file
      e.target.value = '';
    } catch (error) {
      console.error('Error handling file upload:', error);
      // Optionally, show an error message in the UI
      throw error; // Rethrow the error to be handled by the parent component
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
