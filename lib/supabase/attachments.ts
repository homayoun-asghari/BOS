import { v4 as uuidv4 } from 'uuid';
import { createClient } from './client';

const supabase = createClient();

export interface SaveAttachmentParams {
  noteId: string;
  userId: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  storagePath: string;
}

export async function saveAttachment({
  noteId,
  userId,
  fileName,
  fileType,
  fileSize,
  storagePath,
}: {
  noteId: string;
  userId: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  storagePath: string;
}) {
  try {
    console.log('[saveAttachment] === Starting to save attachment ===');
    console.log('[saveAttachment] Input parameters:', {
      noteId,
      userId: userId ? `${userId.substring(0, 8)}...` : 'undefined',
      fileName,
      fileType,
      fileSize,
      storagePath,
    });
    
    // Check if we have all required parameters
    if (!noteId || !userId || !storagePath) {
      const errorMessage = 'Missing required parameters for saving attachment';
      console.error(`[saveAttachment] ${errorMessage}`, {
        hasNoteId: !!noteId,
        hasUserId: !!userId,
        hasStoragePath: !!storagePath,
      });
      throw new Error(errorMessage);
    }

    // Validate noteId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(noteId)) {
      const errorMessage = `Invalid noteId format: ${noteId}. Must be a valid UUID.`;
      console.error(`[saveAttachment] ${errorMessage}`);
      throw new Error(errorMessage);
    }

    console.log('[saveAttachment] Starting attachment save for user:', userId);

    // First, get the profile ID for this user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)  // This assumes the profiles.id matches auth.users.id
      .single();

    if (profileError || !profile) {
      console.error('[saveAttachment] Error fetching profile:', profileError);
      throw new Error('User profile not found. Please complete your profile setup.');
    }

    const attachmentId = uuidv4();
    
    // Prepare the attachment data
    const attachmentData = {
      id: attachmentId,
      note_id: noteId,
      user_id: profile.id,  // Use the profile ID that matches the foreign key
      file_name: fileName,
      file_type: fileType,
      file_size_bytes: fileSize,
      storage_path: storagePath,
      // uploaded_at is automatically set by the database default
    };

    console.log('[saveAttachment] Prepared attachment data:', {
      ...attachmentData,
      // Don't log the full storage path as it might be sensitive
      storage_path: storagePath.length > 50 
        ? `${storagePath.substring(0, 25)}...${storagePath.substring(storagePath.length - 25)}` 
        : storagePath
    });

    // Try to insert the data with transaction logging
    console.log('[saveAttachment] Attempting to insert attachment:', {
      attachmentData: {
        ...attachmentData,
        storage_path: storagePath.length > 50 
          ? `${storagePath.substring(0, 25)}...${storagePath.substring(storagePath.length - 25)}` 
          : storagePath
      },
      noteId,
      userId
    });

    const { data: insertedData, error: insertError, status, statusText } = await supabase
      .from('attachments')
      .insert(attachmentData)
      .select()
      .single();

    console.log('[saveAttachment] Insert response:', {
      status,
      statusText,
      data: insertedData,
      error: insertError ? {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      } : null
    });

    if (insertError) {
      console.error('[saveAttachment] Supabase insert error:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      throw insertError;
    }

    if (!insertedData) {
      const errorMessage = 'No data returned from insert operation';
      console.error(`[saveAttachment] ${errorMessage}`);
      throw new Error(errorMessage);
    }

    console.log('[saveAttachment] Successfully saved attachment to database:', {
      id: insertedData.id,
      note_id: insertedData.note_id,
      file_name: insertedData.file_name,
      storage_path: insertedData.storage_path.length > 50 
        ? `${insertedData.storage_path.substring(0, 25)}...${insertedData.storage_path.substring(insertedData.storage_path.length - 25)}` 
        : insertedData.storage_path
    });
    
    return insertedData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in saveAttachment:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      params: { noteId, userId, fileName, fileType, fileSize, storagePath },
    });
    throw error;
  }
};

/**
 * Gets all attachments for a specific note
 */
export const getNoteAttachments = async (noteId: string) => {
  console.log('[getNoteAttachments] Fetching attachments for note:', noteId);
  
  if (!noteId) {
    console.error('[getNoteAttachments] No noteId provided');
    return [];
  }
  
  try {
    const { data, error, status, statusText } = await supabase
      .from('attachments')
      .select('*')
      .eq('note_id', noteId);

    console.log('[getNoteAttachments] Supabase response:', {
      status,
      statusText,
      dataLength: data?.length,
      error
    });

    if (error) {
      console.error('[getNoteAttachments] Error fetching attachments:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log(`[getNoteAttachments] Found ${data?.length || 0} attachments for note ${noteId}`);
    return data || [];
  } catch (error) {
    console.error('[getNoteAttachments] Error in getNoteAttachments:', error);
    throw error;
  }
};

/**
 * Deletes an attachment from both storage and database
 */
export const deleteAttachment = async (attachmentId: string) => {
  try {
    // First get the attachment to get the storage path
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('storage_path')
      .eq('id', attachmentId)
      .single();

    if (fetchError) {
      console.error('Error fetching attachment for deletion:', fetchError);
      throw fetchError;
    }

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('notes-attachments')
      .remove([attachment.storage_path]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      throw storageError;
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) {
      console.error('Error deleting attachment from database:', dbError);
      throw dbError;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteAttachment:', error);
    throw error;
  }
};



/**
 * Deletes attachments that are no longer referenced in the note content
 * @param noteId The ID of the note to clean up attachments for
 * @param usedStoragePaths Array of storage paths that are still in use
 */
export const cleanupOrphanedAttachments = async (noteId: string, usedStoragePaths: string[]) => {
  try {
    // Get all attachments for this note
    const { data: attachments, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('note_id', noteId);

    if (error) throw error;
    if (!attachments?.length) return { deleted: 0, failed: 0, total: 0 };

    // Normalize the used storage paths by removing any query parameters
    const normalizedUsedPaths = usedStoragePaths.map(path => {
      // Remove any query parameters
      return path.split('?')[0];
    });

    // Find orphaned attachments (those not in usedStoragePaths)
    const orphanedAttachments = attachments.filter(attachment => {
      const attachmentPath = attachment.storage_path;
      if (!attachmentPath) return false;
      
      // Normalize the attachment path by removing any query parameters and 'notes-attachments/' prefix
      const normalizedAttachmentPath = attachmentPath
        .replace(/^notes-attachments\//, '')  // Remove 'notes-attachments/' prefix if present
        .split('?')[0];                        // Remove query parameters
      
      // Get just the filename part for comparison
      const attachmentFilename = normalizedAttachmentPath.split('/').pop();
      
      // Check if this attachment's path exists in the used paths
      const isUsed = normalizedUsedPaths.some(usedPath => {
        // Normalize the used path in the same way
        const normalizedUsedPath = usedPath
          .replace(/^notes-attachments\//, '')
          .split('?')[0];
        
        // Get just the filename part for comparison
        const usedFilename = normalizedUsedPath.split('/').pop();
        
        // Check for matches
        return (
          // Direct path match (after normalization)
          normalizedUsedPath === normalizedAttachmentPath ||
          // Filename match
          usedFilename === attachmentFilename ||
          // Check if one path contains the other
          normalizedUsedPath.includes(normalizedAttachmentPath) ||
          normalizedAttachmentPath.includes(normalizedUsedPath) ||
          // Check if filenames match (case-insensitive)
          usedFilename?.toLowerCase() === attachmentFilename?.toLowerCase()
        );
      });
      
      if (!isUsed) {
        console.log('Found orphaned attachment:', {
          attachmentId: attachment.id,
          storagePath: attachmentPath,
          normalizedPath: normalizedAttachmentPath,
          filename: attachmentFilename,
          usedPaths: normalizedUsedPaths
        });
      }
      
      return !isUsed;
    });
    
    console.log('Found orphaned attachments:', {
      totalAttachments: attachments.length,
      usedPaths: normalizedUsedPaths,
      orphanedCount: orphanedAttachments.length,
      orphanedIds: orphanedAttachments.map(a => a.id)
    });

    // Delete orphaned attachments
    const results = await Promise.allSettled(
      orphanedAttachments.map(async (attachment) => {
        try {
          // First delete from storage
          if (attachment.storage_path) {
            // Normalize the storage path by removing any 'notes-attachments/' prefix
            let storagePath = attachment.storage_path;
            if (storagePath.startsWith('notes-attachments/')) {
              storagePath = storagePath.substring('notes-attachments/'.length);
            }
            
            console.log('Attempting to delete from storage:', {
              bucket: 'notes-attachments',
              path: storagePath,
              attachmentId: attachment.id,
              fullPath: `notes-attachments/${storagePath}`
            });
            
            try {
              // First try to delete with the exact path
              const { data, error: storageError } = await supabase.storage
                .from('notes-attachments')
                .remove([storagePath]);
              
              console.log('Storage deletion response:', { data, error: storageError });
              
              if (storageError) {
                // If the first attempt fails, try to find the file by name
                console.log('Initial delete failed, trying to find file by name...');
                const fileName = storagePath.split('/').pop();
                if (fileName) {
                  const { data: files, error: listError } = await supabase.storage
                    .from('notes-attachments')
                    .list('', { search: fileName });
                  
                  if (!listError && files && files.length > 0) {
                    console.log(`Found ${files.length} matching files, attempting to delete them`);
                    const pathsToDelete = files.map(file => file.name);
                    
                    const { data: deleteData, error: deleteError } = await supabase.storage
                      .from('notes-attachments')
                      .remove(pathsToDelete);
                    
                    if (deleteError) {
                      console.error('Error deleting files by name:', deleteError);
                      throw deleteError;
                    }
                    
                    console.log('Successfully deleted files by name:', pathsToDelete);
                  } else {
                    console.log('No matching files found by name');
                    throw storageError;
                  }
                } else {
                  throw storageError;
                }
              } else {
                console.log(`Successfully deleted file from storage: ${storagePath}`);
              }
            } catch (error) {
              console.error(`Error processing storage deletion for ${storagePath}:`, error);
              throw error;
            }
          }
          
          // Then delete from database
          const { error: dbError } = await supabase
            .from('attachments')
            .delete()
            .eq('id', attachment.id);
            
          if (dbError) {
            console.error(`Error deleting attachment ${attachment.id} from database:`, dbError);
            throw dbError;
          }
          
          console.log(`Successfully deleted attachment ${attachment.id} from database`);
          return true;
        } catch (error) {
          console.error(`Failed to delete attachment ${attachment.id}:`, error);
          throw error;
        }
      })
    );

    const successfulDeletions = results.filter(
      result => result.status === 'fulfilled' && result.value === true
    ).length;

    const failedDeletions = results.length - successfulDeletions;

    if (failedDeletions > 0) {
      console.warn(`Failed to delete ${failedDeletions} orphaned attachments`);
    }

    return { 
      deleted: successfulDeletions,
      failed: failedDeletions,
      total: results.length
    };
  } catch (error) {
    console.error('Error in cleanupOrphanedAttachments:', error);
    throw error;
  }
};
