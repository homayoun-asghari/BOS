import { supabase } from './client';

const getSupabaseClient = () => supabase;

type SignedUrlOptions = {
  expiresIn?: number;
  download?: boolean;
  downloadFilename?: string;
};



export const getSignedUrl = async (
  filePath: string,
  options: SignedUrlOptions = {}
): Promise<string | null> => {
  const { expiresIn = 3600, download = false, downloadFilename } = options;
  const supabase = getSupabaseClient();

  try {
    // Get session without throwing errors
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('No active session found for signed URL generation');
      }
      return null;
    }

    // Normalize the file path by removing any leading 'notes-attachments/' prefix
    const normalizedPath = filePath.startsWith('notes-attachments/') 
      ? filePath.replace('notes-attachments/', '') 
      : filePath;

    // Generate signed URL silently
    
    const { data, error } = await supabase.storage
      .from('notes-attachments')
      .createSignedUrl(normalizedPath, expiresIn, {
        download,
        ...(downloadFilename ? { downloadFilename } : {}),
      });

    if (error) {
      console.error('Error from Supabase when generating signed URL:', {
        error,
        normalizedPath,
        originalPath: filePath
      });
      throw error;
    }
    
    return data.signedUrl;
    
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error generating signed URL:', {
        error,
        filePath,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return null;
  }
};

// All file access is done through signed URLs for private bucket access

export interface UploadPostMediaResult {
  url: string;
  path: string;
  type: 'image' | 'video' | 'voice';
}

export const uploadPostMedia = async (file: File | null | undefined, type: 'image' | 'video' | 'voice'): Promise<UploadPostMediaResult> => {
  console.log('uploadPostMedia called with:', { file, type });
  
  if (!file) {
    const errorMsg = 'No file provided for upload';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Get the current user for user-specific paths
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    const errorMsg = userError?.message || 'User not authenticated';
    console.error('Authentication error:', errorMsg);
    throw new Error(errorMsg);
  }
  
  const BUCKET_NAME = 'post-media';
  
  try {
    // Generate a unique filename with user ID and timestamp
    const fileNameParts = file.name ? file.name.split('.') : [];
    const fileExt = (fileNameParts.length > 1 ? fileNameParts.pop()?.toLowerCase() : null) || 
                   (type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : 'mp3');
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    console.log('Uploading file with details:', {
      originalName: file.name,
      size: file.size,
      type: file.type,
      generatedFileName: fileName,
      fileExt,
      userId: user.id
    });
    const contentType = file.type || (
      type === 'image' ? 'image/jpeg' : 
      type === 'video' ? 'video/mp4' :
      'audio/mpeg'
    );
    
    // Direct upload to public bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '31536000', // 1 year cache
        contentType,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload failed:', {
        error: uploadError,
        fileName,
        bucket: BUCKET_NAME,
        userId: user.id
      });
      throw new Error(uploadError.message);
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);
    
    if (!publicUrl) {
      throw new Error('Could not generate public URL for uploaded file');
    }
    
    return {
      url: publicUrl,
      path: fileName,
      type
    };
    
  } catch (error) {
    console.error('Error in uploadPostMedia:', {
      error,
      fileName,
      bucket: BUCKET_NAME,
      userId: user.id,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Provide user-friendly error message
    const errorMessage = error instanceof Error ? 
      error.message : 
      'Failed to upload file. Please try again.';
    
    throw new Error(errorMessage);
  }
};

export const deletePostMedia = async (path: string): Promise<void> => {
  if (!path) {
    console.log('No path provided to deletePostMedia');
    return;
  }
  
  const BUCKET_NAME = 'post-media';
  
  try {
    console.log('Starting deletePostMedia with path:', path);
    
    // Get the user ID from the current session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const userId = user?.id;
    
    if (userError || !userId) {
      console.error('Error getting user session:', userError?.message || 'No user session');
      throw new Error('Authentication required to delete media');
    }
    
    // Construct the full path with user ID
    const fullPath = `${userId}/${path}`;
    console.log('Attempting to delete from storage:', {
      bucket: BUCKET_NAME,
      userId,
      originalPath: path,
      fullPath
    });
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fullPath]);
    
    console.log('Storage deletion response:', { data, error });
    
    if (error) {
      console.error('Error deleting media file:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details
      });
      throw new Error(`Failed to delete file: ${error.message}`);
    }
    
    console.log('Successfully deleted media file:', fullPath);
  } catch (error) {
    console.error('Unexpected error in deletePostMedia:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      path,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const uploadRoadmapCover = async (file: File): Promise<{ url: string; path: string }> => {
  if (!file) {
    throw new Error('No file provided');
  }

  const BUCKET_NAME = 'roadmap-covers';
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are allowed');
  }
  
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image must be less than 5MB');
  }
  
  // Get the current user for user-specific paths
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error(userError?.message || 'User not authenticated');
  }
  
  // Generate a unique filename with user ID and timestamp
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;
  
  try {
    // Upload the file to the storage bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '31536000', // 1 year cache
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload failed:', {
        error: uploadError,
        fileName,
        bucket: BUCKET_NAME,
        userId: user.id
      });
      throw new Error(uploadError.message);
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);
    
    if (!publicUrl) {
      throw new Error('Could not generate public URL for uploaded file');
    }
    
    return {
      url: publicUrl,
      path: fileName
    };
    
  } catch (error) {
    console.error('Error in uploadRoadmapCover:', {
      error,
      fileName,
      bucket: BUCKET_NAME,
      userId: user.id,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Provide user-friendly error message
    const errorMessage = error instanceof Error ? 
      error.message : 
      'Failed to upload cover image. Please try again.';
    
    throw new Error(errorMessage);
  }
};

/**
 * Extracts the file path from a Supabase storage URL
 * @param urlOrPath The full URL or path of the file in Supabase storage
 * @returns The file path relative to the bucket, or the original input if it's already a path
 */
const extractFilePath = (urlOrPath: string): string => {
  // If it's already a path (doesn't start with http), return as is
  if (!urlOrPath.startsWith('http')) {
    return urlOrPath;
  }
  
  console.log('Extracting path from URL:', urlOrPath);
  
  try {
    const url = new URL(urlOrPath);
    const pathParts = url.pathname.split('/');
    
    // Handle both formats:
    // 1. /storage/v1/object/public/roadmap-covers/...
    // 2. /storage/v1/object/sign/roadmap-covers/...
    const objectIndex = pathParts.indexOf('object');
    if (objectIndex > -1 && pathParts.length > objectIndex + 2) {
      // The path should be everything after 'object/public/...' or 'object/sign/...'
      const pathAfterObject = pathParts.slice(objectIndex + 1).join('/');
      // Remove any query parameters
      const cleanPath = pathAfterObject.split('?')[0];
      console.log('Extracted path:', cleanPath);
      return cleanPath;
    }
    
    // If we have a path that looks like /roadmap-covers/...
    const bucketIndex = pathParts.findIndex(part => part.includes('roadmap-covers'));
    if (bucketIndex > -1) {
      const cleanPath = pathParts.slice(bucketIndex).join('/');
      console.log('Extracted path (direct bucket):', cleanPath);
      return cleanPath;
    }
  } catch (e) {
    console.error('Error parsing URL:', e);
  }
  
  console.warn('Could not extract path from URL, returning as-is:', urlOrPath);
  return urlOrPath;
};

/**
 * Extracts the file path from a Supabase storage URL
 * @param url - The full public URL of the file in Supabase storage
 * @returns The file path relative to the bucket
 */
const extractFilePathFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Find the index of 'storage' in the path
    const storageIndex = pathParts.findIndex(part => part === 'storage');
    if (storageIndex === -1) return null;
    
    // The path should be after 'object/public/'
    const publicIndex = pathParts.indexOf('public', storageIndex);
    if (publicIndex === -1) return null;
    
    // Get the path after 'public/'
    const filePath = pathParts.slice(publicIndex + 1).join('/');
    console.log('Extracted file path:', filePath);
    return filePath || null;
  } catch (e) {
    console.error('Error parsing URL:', e);
    return null;
  }
};

/**
 * Deletes a roadmap cover image from the public storage bucket
 * @param url - The public URL of the file to delete
 * @returns Promise<boolean> - True if deletion was successful or file doesn't exist, false otherwise
 */
export const deleteRoadmapCover = async (url: string): Promise<boolean> => {
  if (!url) return false;
  
  const BUCKET_NAME = 'roadmap-covers';
  
  try {
    // Extract the file path from the public URL
    const pathParts = url.split(`${BUCKET_NAME}/`);
    const filePath = pathParts[1];
    
    if (!filePath) {
      console.error('Could not extract file path from URL');
      return false;
    }
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('Error in deleteRoadmapCover:', error);
    return false;
  }
};
