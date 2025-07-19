import { supabase } from '@/lib/supabase/client';

const ROADMAP_COVERS_BUCKET = 'roadmap-covers';

export interface CoverImage {
  url: string;
  path: string;
}

/**
 * Extracts the file path from a Supabase storage URL
 * @param url The full URL of the file in Supabase storage
 * @returns The file path relative to the bucket, or null if the URL is invalid
 */
export const extractFilePathFromUrl = (url: string): string | null => {
  try {
    if (!url) return null;
    // Extract the path after the bucket name
    const matches = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    return matches ? matches[1] : null;
  } catch (error) {
    console.error('Error extracting file path from URL:', error);
    return null;
  }
};

/**
 * Deletes a roadmap cover image from storage
 * @param imageUrl The URL of the cover image to delete
 * @returns Promise that resolves when the deletion is complete
 */
export const deleteRoadmapCover = async (imageUrl: string): Promise<boolean> => {
  console.log('deleteRoadmapCover called with URL:', imageUrl);
  
  try {
    if (!imageUrl) {
      console.warn('No image URL provided for deletion');
      return false;
    }
    
    // Extract the file path from the URL
    const filePath = extractFilePathFromUrl(imageUrl);
    console.log('Extracted file path:', filePath);
    
    if (!filePath) {
      console.warn('Could not extract file path from URL:', imageUrl);
      return false;
    }
    
    console.log('Attempting to delete file from bucket:', ROADMAP_COVERS_BUCKET, 'path:', filePath);
    
    // First, try to list the specific file to verify it exists
    const { data: fileData } = await supabase.storage
      .from(ROADMAP_COVERS_BUCKET)
      .list(filePath.split('/')[0], {
        search: filePath.split('/')[1]
      });
    
    console.log('File exists check:', fileData ? 'Found' : 'Not found');
    
    if (!fileData || fileData.length === 0) {
      console.log('File not found in storage, might have been already deleted');
      return true; // Consider it a success if file doesn't exist
    }
    
    // Delete the file using the full path
    const { error: deleteError } = await supabase.storage
      .from(ROADMAP_COVERS_BUCKET)
      .remove([filePath]);
    
    if (deleteError) {
      console.error('Error deleting file from storage:', deleteError);
      
      // If the error is because the file doesn't exist, consider it a success
      if (deleteError.message.includes('not found') || deleteError.message.includes('does not exist')) {
        console.log('File was already deleted');
        return true;
      }
      
      return false;
    }
    
    console.log('Successfully deleted cover image:', filePath);
    
    // Verify deletion by trying to get the file
    try {
      const { data: verifyData } = await supabase.storage
        .from(ROADMAP_COVERS_BUCKET)
        .list(filePath.split('/')[0], {
          search: filePath.split('/')[1]
        });
      
      if (verifyData && verifyData.length === 0) {
        console.log('Verified file deletion');
      } else {
        console.warn('File still exists after deletion attempt');
      }
    } catch (verifyError) {
      console.log('Verification result:', verifyError);
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteRoadmapCover:', error);
    return false;
  }
};

/**
 * Uploads a new roadmap cover image
 * @param file The file to upload
 * @param userId The ID of the user uploading the file (for organization)
 * @returns Promise that resolves with the public URL of the uploaded image
 */
export const uploadRoadmapCover = async (file: File, userId: string): Promise<CoverImage | null> => {
  try {
    if (!file || !userId) {
      throw new Error('File and user ID are required');
    }
    
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    
    // Upload the file
    const { error } = await supabase.storage
      .from(ROADMAP_COVERS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg',
      });
      
    if (error) throw error;
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(ROADMAP_COVERS_BUCKET)
      .getPublicUrl(filePath);
      
    return {
      url: publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('Error uploading roadmap cover:', error);
    throw error;
  }
};
