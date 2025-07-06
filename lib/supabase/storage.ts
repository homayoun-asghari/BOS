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
export const uploadFile = async (file: File, pathPrefix: string = '') => {
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
    
    // Create a unique filename with timestamp and random string
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    
    // Construct the file path with proper folder structure
    const pathSegments = [
      userId,
      ...(pathPrefix ? [pathPrefix] : [])
    ].filter(Boolean);
    
    const directoryPath = pathSegments.join('/');
    const filePath = `${directoryPath}/${fileName}`;
    
    console.log('Uploading file to path:', filePath);
    
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
    
    // Construct the public URL directly using the storage URL pattern
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${filePath}`;
    
    console.log('File uploaded successfully. Public URL:', publicUrl);
    
    // Return metadata about the uploaded file
    return {
      path: filePath, // Return the full path including directories
      publicUrl,
      fullPath: `${BUCKET_NAME}/${filePath}`,
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
