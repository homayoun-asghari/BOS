import { createClient } from './client';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient();
const BUCKET_NAME = 'notes-attachments';

export interface UploadResult {
  url: string;
  path: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadEditorFile(
  file: File,
  noteId: string,
  userId: string
): Promise<UploadResult> {
  console.log('[uploadEditorFile] Starting file upload:', {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    noteId,
    userId
  });

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    const error = new Error(`File type ${file.type} is not supported`);
    console.error('[uploadEditorFile] File type validation failed:', error);
    throw error;
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  // Generate a unique file path with proper extension
  let fileExt = '';
  
  // First try to get extension from filename
  const fileNameParts = file.name.split('.');
  if (fileNameParts.length > 1) {
    fileExt = fileNameParts.pop()?.toLowerCase() || '';
  }
  
  // If no extension in filename, try to determine from MIME type
  if (!fileExt) {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
    };
    fileExt = mimeToExt[file.type] || '';
  }
  
  // Ensure we have a valid extension
  if (!fileExt) {
    throw new Error('Could not determine file extension');
  }
  
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `${userId}/${noteId}/${fileName}`;
  
  console.log('[uploadEditorFile] Generated file path:', {
    originalName: file.name,
    generatedFileName: fileName,
    filePath,
    fileExt
  });

  try {
    // Upload the file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      throw uploadError;
    }

    console.log('[uploadEditorFile] File uploaded successfully:', {
      filePath,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    // Generate a signed URL that will be valid for 1 hour
    const { data: signedUrlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600);

    const result = {
      url: signedUrlData?.signedUrl || '', // Return the signed URL if available
      path: filePath, // Keep the storage path for future reference
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    };
    
    console.log('[uploadEditorFile] File upload successful, returning result:', {
      ...result,
      url: result.url ? 'URL generated' : 'No URL generated'
    });
    
    return result;
  } catch (error) {
    console.error('Error in uploadEditorFile:', error);
    throw error;
  }
}
