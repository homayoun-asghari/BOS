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

  // Generate a unique file path
  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
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

    const result = {
      url: filePath, 
      path: filePath,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    };
    
    console.log('[uploadEditorFile] Returning upload result:', result);
    return result;
  } catch (error) {
    console.error('Error in uploadEditorFile:', error);
    throw error;
  }
}
