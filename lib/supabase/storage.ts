import { supabase } from './client';

const BUCKET_NAME = 'notes-attachments';

export interface UploadResult {
  path: string;
  storagePath: string;
  fullPath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface SignedUrlResult {
  signedUrl: string;
  path: string;
  expiresAt: Date;
}

interface DeleteResult {
  success: boolean;
  message?: string;
}

/**
 * Ensures the storage bucket exists and is properly configured
 */
export const ensureBucketExists = async (): Promise<boolean> => {
  try {
    console.log(`Using bucket: ${BUCKET_NAME}`);
    
    // Verify we can access the bucket
    const { data: bucketList, error: accessError } = await supabase.storage
      .from(BUCKET_NAME)
      .list();
      
    if (accessError) {
      console.error('Error accessing bucket. Please check RLS policies:', accessError);
      console.log('Make sure the bucket exists and has proper RLS policies set up.');
      throw new Error(`Cannot access bucket: ${accessError.message}`);
    }
    
    console.log('Bucket access verified. Bucket contents:', bucketList);
    return true;
  } catch (error) {
    console.error('Error in ensureBucketExists:', error);
    return false;
  }
};

/**
 * Uploads a file to Supabase Storage
 */
export const uploadFile = async (file: File, pathPrefix = ''): Promise<UploadResult> => {
  // Validate file
  if (!file) {
    throw new Error('No file provided');
  }

  // Check file size (limit to 5MB)
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  try {
    await ensureBucketExists();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error(userError?.message || 'User not authenticated');
    }
    
    // Generate a unique filename with user ID and timestamp
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${user.id}_${Date.now()}.${fileExt}`;
    
    // Construct the file path with proper folder structure
    const pathSegments = [
      user.id,
      ...(pathPrefix ? [pathPrefix] : []),
    ].filter(Boolean);
    
    const directoryPath = pathSegments.join('/');
    const filePath = `${directoryPath}/${fileName}`;
    
    console.log('Uploading file to path:', filePath);
    
    // Upload the file with proper content type
    const { data, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      });
    
    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    if (!data) {
      throw new Error('No data returned from upload');
    }
    
    // Return the file information
    const storagePath = `${BUCKET_NAME}/${data.path}`;
    return {
      path: data.path,
      storagePath,
      fullPath: storagePath,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    };
  } catch (error) {
    console.error('Error in uploadFile:', error);
    throw error instanceof Error ? error : new Error('Failed to upload file');
  }
};

/**
 * Gets a signed URL for a private file
 * @param filePath Path to the file in the bucket (without the bucket name prefix)
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 * @returns Signed URL result with expiration information
 */
export const getSignedUrl = async (
  filePath: string,
  expiresIn = 3600
): Promise<SignedUrlResult> => {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned when creating signed URL');
    }

    return {
      signedUrl: data.signedUrl,
      path: filePath,
      expiresAt: new Date(Date.now() + expiresIn * 1000)
    };
  } catch (error) {
    console.error('Error in getSignedUrl:', error);
    throw error instanceof Error ? error : new Error('Failed to get signed URL');
  }
};

/**
 * Deletes a file from Supabase Storage
 * @param filePath Path to the file to delete (relative to the bucket)
 * @returns Delete result with success status and optional message
 */
export const deleteFile = async (filePath: string): Promise<DeleteResult> => {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      return {
        success: false,
        message: error.message
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteFile:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete file'
    };
  }
};
