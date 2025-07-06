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
    console.log('[saveAttachment] Starting to save attachment:', {
      noteId,
      userId,
      fileName,
      fileType,
      fileSize,
      storagePath,
    });

    // Validate required parameters
    if (!userId || !storagePath) {
      const error = new Error('Missing required parameters');
      console.error('[saveAttachment] Validation error:', error.message, {
        userId: !!userId,
        storagePath: !!storagePath,
      });
      throw error;
    }

    // Skip saving attachment if we don't have a valid noteId (e.g., when creating a new note)
    if (!noteId || noteId === 'new') {
      console.log('[saveAttachment] Skipping attachment save - no valid noteId provided');
      return null;
    }

    const attachmentId = uuidv4();
    
    // Prepare the attachment data
    const attachmentData = {
      id: attachmentId,
      note_id: noteId,
      user_id: userId,
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

    // Try to insert the data
    const { data, error } = await supabase
      .from('attachments')
      .insert(attachmentData)
      .select()
      .single();

    if (error) {
      console.error('[saveAttachment] Supabase insert error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      
      // Check for common issues
      if (error.code === '42501') {
        throw new Error('Permission denied. Check your RLS policies.');
      } else if (error.code === '23503') {
        throw new Error('Foreign key violation. The note or user might not exist.');
      } else if (error.code === '23505') {
        throw new Error('Duplicate entry. An attachment with this ID already exists.');
      }
      
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from insert operation');
    }

    console.log('[saveAttachment] Successfully saved attachment to database:', {
      id: data.id,
      note_id: data.note_id,
      file_name: data.file_name,
    });
    
    return data;
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
  try {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('note_id', noteId);

    if (error) {
      console.error('Error fetching attachments:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getNoteAttachments:', error);
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
      // Get the storage path for this attachment
      const attachmentPath = attachment.storage_path;
      if (!attachmentPath) return false;
      
      // Check if this attachment's path exists in the used paths
      const isUsed = normalizedUsedPaths.some(usedPath => 
        usedPath.endsWith(attachmentPath) || 
        attachmentPath.endsWith(usedPath) ||
        usedPath.includes(attachmentPath) ||
        attachmentPath.includes(usedPath)
      );
      
      return !isUsed;
    });

    // Delete orphaned attachments
    const results = await Promise.allSettled(
      orphanedAttachments.map(attachment => 
        deleteAttachment(attachment.id)
      )
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
