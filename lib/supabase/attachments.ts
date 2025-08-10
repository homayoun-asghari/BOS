import { v4 as uuidv4 } from 'uuid';
import { supabase } from './client';

export interface SaveAttachmentParams {
  noteId: string;
  userId: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  storagePath: string;
  // publicUrl is not stored in the database, but can be used for reference
  publicUrl?: string;
}

export async function saveAttachment(params: SaveAttachmentParams) {
  const { noteId, userId, fileName, fileType, fileSize, storagePath, publicUrl } = params;
  
  try {
    console.log('[saveAttachment] === Starting to save attachment ===');
    console.log('[saveAttachment] Input parameters:', {
      noteId,
      userId: userId ? `${userId.substring(0, 8)}...` : 'undefined',
      fileName,
      fileType,
      fileSize,
      storagePath: storagePath.length > 50 
        ? `${storagePath.substring(0, 25)}...${storagePath.substring(storagePath.length - 25)}` 
        : storagePath,
      publicUrl: publicUrl ? '***public-url-present***' : 'undefined'
    });

    // Log the Supabase client configuration
    console.log('[saveAttachment] Supabase client config:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***present***' : 'missing',
      storageUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/notes-attachments/` : 'missing'
    });
    
    // Check if we have all required parameters
    if (!noteId || !userId || !storagePath) {
      const error = new Error('Missing required parameters');
      const errorDetails = {
        hasNoteId: !!noteId,
        hasUserId: !!userId,
        hasStoragePath: !!storagePath,
        noteIdLength: noteId?.length,
        userIdLength: userId?.length,
        storagePathLength: storagePath?.length
      };
      console.error('[saveAttachment] Validation error:', {
        message: error.message,
        details: errorDetails
      });
      throw error;
    }
    
    // Log the actual values (truncated for sensitive data)
    console.log('[saveAttachment] Validated parameters:', {
      noteId: noteId ? `${noteId.substring(0, 4)}...${noteId.substring(noteId.length - 4)}` : 'undefined',
      userId: userId ? `${userId.substring(0, 4)}...${userId.substring(userId.length - 4)}` : 'undefined',
      storagePath: storagePath ? `...${storagePath.substring(Math.max(0, storagePath.length - 50))}` : 'undefined'
    });

    // Validate noteId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(noteId)) {
      const errorMessage = `Invalid noteId format: ${noteId}. Must be a valid UUID.`;
      console.error(`[saveAttachment] ${errorMessage}`);
      throw new Error(errorMessage);
    }

    console.log('[saveAttachment] Starting attachment save for user:', userId);

    // First, get the profile ID for this user
    console.log('[saveAttachment] Verifying user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)  // This assumes the profiles.id matches auth.users.id
      .single();
      
    console.log('[saveAttachment] Profile check result:', {
      profileFound: !!profile,
      error: profileError,
      profileId: profile?.id
    });

    if (profileError || !profile) {
      console.error('[saveAttachment] Error fetching profile:', profileError);
      throw new Error('User profile not found. Please complete your profile setup.');
    }

    // Check if the note exists and the user has permission to add attachments
    console.log('[saveAttachment] Checking note permissions...');
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, user_id')
      .eq('id', noteId)
      .single();
      
    console.log('[saveAttachment] Note check result:', {
      noteFound: !!note,
      error: noteError,
      noteUserId: note?.user_id,
      currentUserId: userId
    });

    const attachmentId = uuidv4();
    
    // Prepare the attachment data
    const attachmentData = {
      id: attachmentId,
      note_id: noteId,
      user_id: userId,
      file_name: fileName,
      file_type: fileType || null,
      file_size_bytes: fileSize || null,
      storage_path: storagePath,
      uploaded_at: new Date().toISOString()
    };

    console.log('[saveAttachment] Prepared attachment data:', {
      ...attachmentData,
      // Don't log the full storage path as it might be sensitive
      storage_path: storagePath.length > 50 
        ? `${storagePath.substring(0, 25)}...${storagePath.substring(storagePath.length - 25)}` 
        : storagePath
    });

    // Insert the attachment
    console.log('[saveAttachment] Inserting attachment into database:', {
      table: 'attachments',
      data: {
        ...attachmentData,
        // Truncate long values for logging
        storage_path: attachmentData.storage_path 
          ? `...${attachmentData.storage_path.substring(Math.max(0, attachmentData.storage_path.length - 30))}` 
          : 'undefined',
        file_name: attachmentData.file_name || 'undefined',
        file_type: attachmentData.file_type || 'undefined',
        file_size_bytes: attachmentData.file_size_bytes || 0
      },
      // Log the raw SQL that would be executed (for debugging)
      _query: `
        INSERT INTO attachments (
          id, note_id, user_id, file_name, file_type, 
          file_size_bytes, storage_path, uploaded_at
        ) VALUES (
          '${attachmentData.id}', 
          '${attachmentData.note_id}', 
          '${attachmentData.user_id}', 
          ${attachmentData.file_name ? `'${attachmentData.file_name.replace(/'/g, "''")}'` : 'NULL'}, 
          ${attachmentData.file_type ? `'${attachmentData.file_type}'` : 'NULL'}, 
          ${attachmentData.file_size_bytes || 'NULL'}, 
          '${attachmentData.storage_path}', 
          '${attachmentData.uploaded_at}'
        )
        RETURNING *
      `
    });
    
    // Log the Supabase client config for debugging
    console.log('[saveAttachment] Supabase client config:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10)}...` 
        : 'NOT SET'
    });

    const { data: insertedData, error: insertError } = await supabase
      .from('attachments')
      .insert(attachmentData)
      .select()
      .single();
      
    console.log('[saveAttachment] Insert operation completed:', {
      status: insertError ? 'failed' : 'success',
      error: insertError,
      insertedData: insertedData || null
    });

    // Type-safe error details extraction
    type ErrorWithExtras = Error & {
      code?: string;
      details?: string;
      hint?: string;
      details_parsed?: Record<string, unknown>;
      hint_parsed?: Record<string, unknown>;
      query?: string;
    };

    const getErrorDetails = (error: ErrorWithExtras | null) => {
      if (!error) return null;
      
      const details: Record<string, unknown> = {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      };

      // Safely include parsed details if available
      if (error.details_parsed && typeof error.details_parsed === 'object') {
        Object.assign(details, error.details_parsed);
      }
      if (error.hint_parsed && typeof error.hint_parsed === 'object') {
        Object.assign(details, { hint_parsed: error.hint_parsed });
      }
      if (error.query) {
        details.query = error.query;
      }

      return details;
    };

    const errorDetails = insertError ? getErrorDetails(insertError) : null;

    console.log('[saveAttachment] Insert response:', {
      success: !insertError,
      data: insertedData,
      error: errorDetails,
      // Include the raw error for debugging
      rawError: insertError,
      // Safely access the query property
      query: (insertError as unknown as { query?: string })?.query
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
 * @param currentContent Optional current content of the note to clean up
 */
export const cleanupOrphanedAttachments = async (
  noteId: string, 
  usedStoragePaths: string[], 
  currentContent?: string
): Promise<{deleted: number; failed: number; total: number; updatedContent?: string}> => {
  try {
    // Get all attachments for this note
    const { data: attachments, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('note_id', noteId);

    if (error) throw error;
    if (!attachments?.length) return { deleted: 0, failed: 0, total: 0 };

    // Normalize the used storage paths by removing any query parameters
    const normalizedUsedPaths = usedStoragePaths.map(path => 
      path.split('?')[0].replace(/^notes-attachments\//, '')
    );

    // Find orphaned attachments (those not in usedStoragePaths)
    const orphanedAttachments = attachments.filter(attachment => {
      if (!attachment.storage_path) return false;
      
      // Normalize the attachment path
      const attachmentPath = attachment.storage_path.replace(/^notes-attachments\//, '');
      const attachmentFilename = attachmentPath.split('/').pop();
      
      // Check if this attachment's path exists in the used paths
      return !normalizedUsedPaths.some(usedPath => {
        const usedFilename = usedPath.split('/').pop();
        return (
          usedPath === attachmentPath ||
          usedPath.endsWith(attachmentPath) ||
          usedPath.includes(attachmentFilename) ||
          usedFilename === attachmentFilename
        );
      });
    });

    // Silently process orphaned attachments

    // Process content updates if we have content and orphaned attachments
    let updatedContent = currentContent;
    let contentWasUpdated = false;
    
    if (updatedContent && orphanedAttachments.length > 0) {
      // Create patterns to match orphaned attachments in the content
      const patterns = orphanedAttachments.reduce<RegExp[]>((acc, attachment) => {
        if (!attachment.storage_path) return acc;
        
        const escapedPath = attachment.storage_path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return [
          ...acc,
          // Match in URLs
          new RegExp(`https?:\\/\\/[^\\s"']+\\/storage\\/v1\\/object\\/(?:public|sign)\\/${escapedPath}(?:\\?[^"'\\s]*)?`, 'gi'),
          // Match in data attributes
          new RegExp(`data-(?:original-path|storage-path)=["']${escapedPath}(?:\\?[^"']*)?["']`, 'gi')
        ];
      }, []);
      
      // Apply all patterns to remove references to orphaned attachments
      const newContent = patterns.reduce((content, pattern) => 
        content.replace(pattern, ''), updatedContent || '');
      
      if (newContent !== updatedContent) {
        updatedContent = newContent;
        contentWasUpdated = true;
        if (process.env.NODE_ENV !== 'production') {
          console.log('Updated content after removing orphaned attachments');
        }
      }
    }

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
            
            if (process.env.NODE_ENV !== 'production') {
              console.log('Attempting to delete from storage:', {
                bucket: 'notes-attachments',
                path: storagePath,
                attachmentId: attachment.id,
                fullPath: `notes-attachments/${storagePath}`
              });
            }
            
            try {
              // First try to delete with the exact path
              const { error: storageError } = await supabase.storage
                .from('notes-attachments')
                .remove([storagePath]);
              
              if (storageError) {
                // If the first attempt fails, try to find the file by name
                if (process.env.NODE_ENV !== 'production') {
                  console.log('Initial delete failed, trying to find file by name...');
                }
                const fileName = storagePath.split('/').pop();
                if (fileName) {
                  const { data: files, error: listError } = await supabase.storage
                    .from('notes-attachments')
                    .list('', { search: fileName });
                  
                  if (!listError && files && files.length > 0) {
                    const pathsToDelete = files.map(file => file.name);
                    
                    const { error: deleteError } = await supabase.storage
                      .from('notes-attachments')
                      .remove(pathsToDelete);
                    
                    if (deleteError) {
                      if (process.env.NODE_ENV !== 'production') {
                        console.error('Error deleting files by name:', deleteError);
                      }
                      throw deleteError;
                    }
                  } else {
                    throw storageError;
                  }
                } else {
                  throw storageError;
                }
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              if (process.env.NODE_ENV !== 'production') {
                console.error(`Error processing storage deletion for ${storagePath}:`, error);
              }
              throw new Error(`Storage deletion failed for ${storagePath}: ${errorMessage}`);
            }
          }
          
          // Then delete from database
          const { error: dbError } = await supabase
            .from('attachments')
            .delete()
            .eq('id', attachment.id);
            
          if (dbError) {
            if (process.env.NODE_ENV !== 'production') {
              console.error(`Error deleting attachment ${attachment.id} from database:`, dbError);
            }
            throw new Error(`Database deletion failed for ${attachment.id}: ${dbError.message}`);
            throw dbError;
          }
          
          // Silently handle successful deletion
          return true;
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.error(`Failed to delete attachment ${attachment.id}:`, error);
          }
          throw error;
        }
      })
    );

    const successfulDeletions = results.filter(
      (result): result is PromiseFulfilledResult<boolean> => 
        result.status === 'fulfilled' && result.value === true
    ).length;

    const failedDeletions = results.length - successfulDeletions;

    if (failedDeletions > 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Failed to delete ${failedDeletions} orphaned attachments`);
      }
    }

    return {
      deleted: successfulDeletions,
      failed: failedDeletions,
      total: orphanedAttachments.length,
      ...(contentWasUpdated && { updatedContent })
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error in cleanupOrphanedAttachments:', error);
    }
    throw error;
  }
};
