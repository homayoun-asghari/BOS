import { createClient } from './client';
import { getCurrentUser, getSession } from './auth';

const BUCKET_NAME = 'notes-attachments';

// Initialize Supabase client
const supabase = createClient();

// Get authenticated Supabase client with user session
const getAuthClient = async () => {
  try {
    const session = await getSession();
    if (!session) {
      throw new Error('No active session. Please sign in.');
    }
    return supabase;
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error('Failed to authenticate. Please try signing in again.');
  }
};

/**
 * Ensures the storage bucket exists and is properly configured
 */
export const ensureBucketExists = async () => {
  try {
    console.log(`Using bucket: ${BUCKET_NAME}`);
    
    // Verify we can access the bucket
    const { error: accessError } = await supabase.storage
      .from(BUCKET_NAME)
      .list();
      
    if (accessError) {
      console.error('Error accessing bucket. Please check RLS policies:', accessError);
      throw new Error(`Cannot access bucket: ${accessError.message}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in ensureBucketExists:', error);
    return false;
  }
};

/**
 * Uploads a file to Supabase Storage
 */
export const uploadFile = async (file: File, path: string = '') => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file size (limit to 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds the limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Ensure the bucket exists and we have an authenticated client
    await ensureBucketExists();
    const authClient = await getAuthClient();
    
    // Get user ID for path organization
    const user = await getCurrentUser();
    const userId = user?.id || 'anonymous';
    
    // Create a unique filename with user ID for better organization
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = path ? `${userId}/${path}/${fileName}` : `${userId}/${fileName}`;
    
    // Upload the file with proper content type
    const { data, error } = await authClient.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      });
    
    if (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    // Get the public URL
    const { data: { publicUrl } } = authClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    // Return metadata about the uploaded file
    return {
      path: data.path,
      publicUrl,
      fullPath: `${BUCKET_NAME}/${data.path}`,
      fileName: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in uploadFile:', error);
    throw error;
  }
};

/**
 * Deletes a file from Supabase Storage
 */
export const deleteFile = async (filePath: string) => {
  try {
    // Get authenticated client and delete the file
    const authClient = await getAuthClient();
    const { error } = await authClient.storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteFile:', error);
    throw error;
  }
};
