import { supabase } from './client';

// Helper function to safely get error details
function getErrorDetails(error: unknown): { message: string; statusCode?: number } {
  if (error && typeof error === 'object') {
    const err = error as { message?: string; statusCode?: number; status?: number };
    return {
      message: err.message || 'Unknown error',
      statusCode: err.statusCode || err.status
    };
  }
  return { message: String(error) };
}

export async function syncAttachmentBuckets(noteId: string, isPublic: boolean): Promise<{ success: boolean; error?: string }> {
  const startTime = new Date().toISOString();
  console.log('[syncAttachmentBuckets] Starting sync...', { noteId, isPublic });
  
  // Early return if no noteId provided
  if (!noteId) {
    console.warn('[syncAttachmentBuckets] No noteId provided, skipping sync');
    return { success: false, error: 'No noteId provided' };
  }

  try {
    // 1. Fetch all attachments for the note
    console.log(`[syncAttachmentBuckets] Fetching attachments for note: ${noteId}`);
    const { data: attachments, error: fetchError, status } = await supabase
      .from('attachments')
      .select('*')
      .eq('note_id', noteId);

    console.log(`[syncAttachmentBuckets] Fetch result:`, { 
      status, 
      count: attachments?.length, 
      error: fetchError,
      noteId,
      isPublic,
      currentTime: new Date().toISOString()
    });

    if (fetchError) {
      console.error('[syncAttachmentBuckets] Error fetching attachments:', fetchError);
      throw new Error('Failed to fetch attachments');
    }

    if (!attachments || attachments.length === 0) {
      console.log('[syncAttachmentBuckets] No attachments found for note, nothing to sync');
      return; // No attachments to sync
    }

    console.log(`[syncAttachmentBuckets] Found ${attachments.length} attachments to process`);
    
    // When isPublic is true, we're making private -> public, so source is private, target is public
    // When isPublic is false, we're making public -> private, so source is public, target is private
    const sourceBucket = isPublic ? 'notes-attachments' : 'notes-attachments-public';
    const targetBucket = isPublic ? 'notes-attachments-public' : 'notes-attachments';
    
    // If source and target buckets are the same, no need to move anything
    if (sourceBucket === targetBucket) {
      console.log(`[syncAttachmentBuckets] Source and target buckets are the same (${sourceBucket}), skipping sync`);
      return;
    }
    
    console.log(`[syncAttachmentBuckets] Bucket mapping - isPublic: ${isPublic}, source: ${sourceBucket}, target: ${targetBucket}`);
    
    console.log(`[syncAttachmentBuckets] Moving files from ${sourceBucket} to ${targetBucket}`, {
      noteId,
      isPublic,
      sourceBucket,
      targetBucket,
      currentTime: new Date().toISOString()
    });

    // 2. Process each attachment
    for (const [index, attachment] of attachments.entries()) {
      console.log(`\n[syncAttachmentBuckets] Processing attachment ${index + 1}/${attachments.length}:`, {
        id: attachment.id,
        originalPath: attachment.storage_path,
        currentBucket: attachment.storage_path?.split('/')[0] || 'unknown'
      });
      
      const sourcePath = attachment.storage_path;
      if (!sourcePath) {
        console.error(`[syncAttachmentBuckets] Attachment ${attachment.id} has no storage_path`);
        continue;
      }

      // Clean the source path by removing any bucket prefix
      let cleanSourcePath = sourcePath
        .replace(/^(notes-attachments|notes-attachments-public)\//, '');
      
      // For private bucket, ensure the path has the correct structure: userId/noteId/filename
      if (targetBucket === 'notes-attachments') {
        const pathParts = cleanSourcePath.split('/');
        const fileName = pathParts.pop() || '';
        
        // Get the current user for the upload
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('[syncAttachmentBuckets] Error getting current user:', userError);
          throw new Error('User not authenticated');
        }
        
        // Always use the current user's ID and the target note ID
        cleanSourcePath = `${user.id}/${noteId}/${fileName}`;
        
        console.log('[syncAttachmentBuckets] Constructed private path:', {
          originalPath: sourcePath,
          cleanSourcePath,
          userId: user.id,
          noteId,
          fileName
        });
      }
      
      // Construct full paths with bucket names
      const fullSourcePath = `${sourceBucket}/${cleanSourcePath}`;
      let fullTargetPath = `${targetBucket}/${cleanSourcePath}`;
      
      // Debug log the paths
      console.log('[syncAttachmentBuckets] Paths:', {
        originalPath: sourcePath,
        cleanSourcePath,
        fullSourcePath,
        fullTargetPath,
        sourceBucket,
        targetBucket
      });
      
      console.log(`[syncAttachmentBuckets] Copying from ${fullSourcePath} to ${fullTargetPath}`);

      // 3. Copy file between buckets
      try {
        console.log(`[syncAttachmentBuckets] Attempting to copy file...`, {
          sourceBucket,
          cleanSourcePath,
          fullSourcePath,
          fullTargetPath,
          currentTime: new Date().toISOString()
        });
        
        // First check if source file exists and is accessible
        console.log('[syncAttachmentBuckets] Checking if source file exists...');
        try {
          const { error: sourceError } = await supabase.storage
            .from(sourceBucket)
            .download(cleanSourcePath);
            
          if (sourceError) {
            console.error('[syncAttachmentBuckets] Source file error:', {
              error: sourceError,
              sourceBucket,
              cleanSourcePath,
              fullSourcePath,
              currentTime: new Date().toISOString()
            });
            
            // Try to list files in the directory to debug
            const dirPath = cleanSourcePath.split('/').slice(0, -1).join('/');
            const { data: files, error: listError } = await supabase.storage
              .from(sourceBucket)
              .list(dirPath);
              
            console.log('[syncAttachmentBuckets] Directory contents:', {
              dirPath,
              files: files?.map(f => f.name) || [],
              listError,
              sourceBucket
            });
            
            // Skip this file but continue with others
            console.log(`[syncAttachmentBuckets] Skipping file ${cleanSourcePath} as it doesn't exist in ${sourceBucket}`);
            continue;
          }
        } catch (checkError) {
          console.error('[syncAttachmentBuckets] Error checking source file:', {
            error: checkError,
            sourceBucket,
            cleanSourcePath,
            currentTime: new Date().toISOString()
          });
          continue;
        }
        
        // 1. Download the file from source bucket
        console.log(`[syncAttachmentBuckets] Downloading file from source bucket ${sourceBucket}...`, {
          cleanSourcePath,
          sourceBucket,
          targetBucket,
          isPublic
        });
        
        // For public buckets, we need to use the public URL instead of the storage API
        let fileData: Blob | null = null;
        
        try {
          if (sourceBucket === 'notes-attachments-public') {
            const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/notes-attachments-public/${cleanSourcePath}`;
            console.log(`[syncAttachmentBuckets] Fetching public file from URL: ${publicUrl}`);
            
            try {
              const response = await fetch(publicUrl);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              fileData = await response.blob();
              console.log(`[syncAttachmentBuckets] Successfully downloaded public file: ${cleanSourcePath} (${fileData.size} bytes)`);
            } catch (publicError) {
              console.error(`[syncAttachmentBuckets] Error downloading public file ${cleanSourcePath}:`, publicError);
              const errorMessage = publicError instanceof Error ? publicError.message : String(publicError);
              throw new Error(`Failed to download public file: ${errorMessage}`);
            }
          } else {
            // For private buckets, use the storage API
            console.log(`[syncAttachmentBuckets] Downloading private file from ${sourceBucket}/${cleanSourcePath}`);
            const { data, error } = await supabase.storage
              .from(sourceBucket)
              .download(cleanSourcePath);
              
            if (error || !data) {
              console.error(`[syncAttachmentBuckets] Error downloading private file:`, {
                error,
                sourceBucket,
                cleanSourcePath,
                currentTime: new Date().toISOString()
              });
              throw error || new Error('No data received when downloading file');
            }
            
            fileData = data;
            console.log(`[syncAttachmentBuckets] Successfully downloaded private file: ${cleanSourcePath} (${fileData.size} bytes)`);
          }
          
          if (!fileData) {
            throw new Error('File data is null or undefined after download');
          }
          
          // Verify file data is valid
          if (fileData.size === 0) {
            console.warn(`[syncAttachmentBuckets] Warning: Downloaded file ${cleanSourcePath} has 0 bytes`);
          }
          
        } catch (downloadError) {
          console.error(`[syncAttachmentBuckets] Error downloading file ${cleanSourcePath} from ${sourceBucket}:`, downloadError);
          
          // Try to list files in the directory to debug
          try {
            const dirPath = cleanSourcePath.split('/').slice(0, -1).join('/');
            const { data: files, error: listError } = await supabase.storage
              .from(sourceBucket)
              .list(dirPath);
              
            console.log(`[syncAttachmentBuckets] Directory contents in ${sourceBucket}/${dirPath}:`, {
              files: files?.map(f => ({
                name: f.name,
                size: f.metadata?.size,
                type: f.metadata?.mimetype,
                lastModified: f.updated_at
              })) || [],
              listError,
              cleanSourcePath,
              currentTime: new Date().toISOString()
            });
          } catch (listError) {
            console.error(`[syncAttachmentBuckets] Error listing directory contents:`, listError);
          }
          
          // Skip this file but continue with other attachments
          console.log(`[syncAttachmentBuckets] Skipping file due to download error: ${cleanSourcePath}`);
          continue;
        }
        
        // 2. Upload to target bucket with the same filename (no need for unique names)
        console.log('[syncAttachmentBuckets] Uploading file to target bucket...', {
          targetBucket,
          cleanSourcePath,
          fileSize: fileData.size,
          fileType: fileData.type
        });
        
        // Use the clean path that was already processed
        const filePath = cleanSourcePath;
        
        try {
          // Ensure the filePath is clean and doesn't contain the bucket name
          const cleanUploadPath = filePath.replace(/^(notes-attachments|notes-attachments-public)\//, '');
          
          console.log(`[syncAttachmentBuckets] Uploading file to ${targetBucket}`, {
            cleanUploadPath,
            fileSize: fileData.size,
            fileType: fileData.type
          });
            
          console.log(`[syncAttachmentBuckets] Upload details:`, {
            targetBucket,
            cleanUploadPath,
            fileSize: fileData.size,
            fileType: fileData.type,
            isPublic: targetBucket === 'notes-attachments-public',
            pathParts: cleanUploadPath.split('/')
          });
          
          // Add retry logic for uploads
          const maxRetries = 3;
          let uploadError = null;
          let uploadData = null;
          let retryCount = 0;
          
          while (retryCount < maxRetries) {
            try {
              console.log(`[syncAttachmentBuckets] Upload attempt ${retryCount + 1}/${maxRetries} to ${targetBucket}/${cleanUploadPath}`);
              
              const result = await supabase.storage
                .from(targetBucket)
                .upload(cleanUploadPath, fileData, {
                  cacheControl: '3600',
                  upsert: true,
                  contentType: fileData.type || 'application/octet-stream'
                });
                
              uploadError = result.error;
              uploadData = result.data;
              
              if (!uploadError) {
                console.log(`[syncAttachmentBuckets] Upload successful on attempt ${retryCount + 1}`);
                break;
              }
              
              // If we get here, there was an error
              console.warn(`[syncAttachmentBuckets] Upload attempt ${retryCount + 1} failed:`, {
                error: uploadError,
                cleanUploadPath,
                targetBucket,
                fileSize: fileData.size,
                fileType: fileData.type,
                retryCount: retryCount + 1,
                maxRetries,
                pathParts: cleanUploadPath.split('/')
              });
              
              // If it's a rate limit error, wait before retrying
              const isRateLimited = (
                uploadError.message?.includes('rate limit') ||
                (uploadError as { statusCode?: number }).statusCode === 429 ||
                (uploadError as { status?: number }).status === 429
              );
              
              if (isRateLimited) {
                const backoffTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
                console.log(`[syncAttachmentBuckets] Rate limited, waiting ${backoffTime}ms before retry`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
              }
              
            } catch (uploadException) {
              uploadError = uploadException;
              console.error(`[syncAttachmentBuckets] Exception during upload attempt ${retryCount + 1}:`, uploadException);
            }
            
            retryCount++;
          }
          
          if (uploadError) {
            // Type-safe error handling with proper type assertion
            const error = uploadError as Error & { statusCode?: number; status?: number; message?: string };
            const statusCode = error.statusCode || error.status;
            const isNonCriticalError = statusCode === 400 || statusCode === 403;
            
            // Log with appropriate level based on error type
            const logMethod = isNonCriticalError ? console.warn : console.error;
            logMethod(`[syncAttachmentBuckets] ${isNonCriticalError ? 'Non-critical error' : 'Error'} syncing file ${targetBucket}/${cleanUploadPath}`, {
              statusCode,
              error: error?.message || 'Unknown error',
              cleanUploadPath,
              targetBucket,
              fileSize: fileData.size,
              fileType: fileData.type,
              totalAttempts: retryCount,
              isNonCriticalError,
              errorString: String(error)
            });
            
            // For non-critical errors, we'll check if the file is already in the target bucket
            // If it is, we can safely continue since the end state is correct
            if (isNonCriticalError) {
              try {
                const { data: fileExists } = await supabase.storage
                  .from(targetBucket)
                  .download(cleanUploadPath);
                  
                if (fileExists) {
                  console.log(`[syncAttachmentBuckets] File exists in target bucket, considering sync successful:`, {
                    targetBucket,
                    cleanUploadPath,
                    fileSize: fileData.size,
                    fileType: fileData.type
                  });
                  // Continue to next file since the file is already in the correct state
                  continue;
                } else {
                  console.warn(`[syncAttachmentBuckets] File not found in target bucket after error:`, {
                    targetBucket,
                    cleanUploadPath
                  });
                }
              } catch (verifyError) {
                console.warn('[syncAttachmentBuckets] Error verifying file existence:', {
                  error: verifyError instanceof Error ? verifyError.message : String(verifyError),
                  cleanUploadPath,
                  targetBucket
                });
              }
            }
            
            // Don't throw, just return the error with proper typing
            const errorDetails = getErrorDetails(uploadError);
            return { 
              success: false, 
              error: errorDetails.message,
              statusCode: errorDetails.statusCode
            };
          }
          
          console.log(`[syncAttachmentBuckets] Successfully uploaded file to ${targetBucket}`, {
            filePath: filePath,
            uploadData: uploadData,
            fullTargetPath: `${targetBucket}/${filePath}`
          });
          
          // Update the file path to be used for subsequent operations
          fullTargetPath = `${targetBucket}/${filePath}`;
        } catch (error) {
          console.error(`[syncAttachmentBuckets] Error during file handling for ${cleanSourcePath}:`, error);
          // Skip this file but continue with other attachments
          continue;
        }
        
        console.log(`[syncAttachmentBuckets] Successfully copied to ${fullTargetPath}`);

        // 4. Delete original file with retry logic
        const maxDeleteAttempts = 3;
        let deleteError = null;
        let deleteSuccess = false;
        
        for (let attempt = 1; attempt <= maxDeleteAttempts; attempt++) {
          console.log(`[syncAttachmentBuckets] [Attempt ${attempt}/${maxDeleteAttempts}] Deleting original file: ${cleanSourcePath}`, {
            sourceBucket,
            cleanSourcePath,
            currentTime: new Date().toISOString()
          });
          
          try {
            const { error } = await supabase.storage
              .from(sourceBucket)
              .remove([cleanSourcePath]);
              
            if (error) {
              deleteError = error;
              console.warn(`[syncAttachmentBuckets] [Attempt ${attempt}] Error deleting file:`, {
                error,
                sourceBucket,
                cleanSourcePath,
                attempt,
                maxDeleteAttempts
              });
              
              // If it's a rate limit error, wait before retrying
              const isRateLimited = (
                error.message?.includes('rate limit') ||
                (error as { statusCode?: number }).statusCode === 429 ||
                (error as { status?: number }).status === 429
              );
              
              if (isRateLimited && attempt < maxDeleteAttempts) {
                const backoffTime = Math.pow(2, attempt) * 1000; // Exponential backoff
                console.log(`[syncAttachmentBuckets] Rate limited, waiting ${backoffTime}ms before retry`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
              }
              
              continue;
            }
            
            // If we get here, deletion was successful
            deleteSuccess = true;
            console.log('[syncAttachmentBuckets] Successfully deleted original file', {
              sourceBucket,
              cleanSourcePath,
              currentTime: new Date().toISOString()
            });
            break;
            
          } catch (deleteException) {
            deleteError = deleteException;
            console.error(`[syncAttachmentBuckets] Exception during delete attempt ${attempt}:`, deleteException);
            
            if (attempt < maxDeleteAttempts) {
              const backoffTime = Math.pow(2, attempt) * 1000; // Exponential backoff
              console.log(`[syncAttachmentBuckets] Waiting ${backoffTime}ms before retry`);
              await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
          }
        }
        
        if (!deleteSuccess && deleteError) {
          console.error(`[syncAttachmentBuckets] Failed to delete original file after ${maxDeleteAttempts} attempts:`, {
            error: deleteError,
            sourceBucket,
            cleanSourcePath,
            currentTime: new Date().toISOString()
          });
          
          // Log the file's existence in the source bucket
          try {
            const { data: fileExists } = await supabase.storage
              .from(sourceBucket)
              .list(cleanSourcePath.split('/').slice(0, -1).join('/'), {
                search: cleanSourcePath.split('/').pop() || ''
              });
              
            console.log(`[syncAttachmentBuckets] File existence check in ${sourceBucket}:`, {
              fileExists: fileExists?.length ? 'Found' : 'Not found',
              cleanSourcePath,
              searchPattern: cleanSourcePath.split('/').pop()
            });
          } catch (checkError) {
            console.error('[syncAttachmentBuckets] Error checking file existence:', checkError);
          }
          
          // Continue with the next attachment even if deletion failed
          // since the copy operation was successful
        }

        // 5. Update attachment record with new path
        console.log(`[syncAttachmentBuckets] Updating attachment record ${attachment.id} with new path: ${filePath}`);
        const { data: updateData, error: updateError } = await supabase
          .from('attachments')
          .update({ 
            storage_path: filePath
          })
          .eq('id', attachment.id)
          .select();

        if (updateError) {
          console.error(`[syncAttachmentBuckets] Error updating attachment ${attachment.id}:`, updateError);
          // Continue to next attachment
        } else {
          console.log(`[syncAttachmentBuckets] Updated attachment record:`, updateData);

          // 6. Update note content to replace old paths with new ones
          console.log(`[syncAttachmentBuckets] Updating note content with new file paths`);
          const { data: noteData } = await supabase
            .from('notes')
            .select('content')
            .eq('id', noteId)
            .single();

          if (noteData && noteData.content) {
            // Make a deep copy of the content to avoid modifying the original
            const updatedContent = JSON.parse(JSON.stringify(noteData.content));
            let contentModified = false;
            
            // Define types for the content nodes
            interface NodeAttributes {
              src?: string;
              'data-storage-path'?: string;
              [key: string]: string | undefined;
            }
            
            interface ContentNode {
              type: string;
              attrs?: NodeAttributes;
              content?: ContentNode[];
              [key: string]: unknown;
            }
            
            // Function to update image paths in the content
            const updateImagePaths = (content: ContentNode[]) => {
              if (!content || !Array.isArray(content)) return;
              
              for (let i = 0; i < content.length; i++) {
                const node = content[i];
                
                if (node.type === 'image' && node.attrs?.src) {
                  const oldSrc = node.attrs.src;
                  
                  // Handle both public to private and private to public transitions
                  if (isPublic) {
                    // Private -> Public transition
                    if (oldSrc.includes('notes-attachments/') || !oldSrc.startsWith('http')) {
                      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/notes-attachments-public/${filePath}`;
                      
                      console.log(`[syncAttachmentBuckets] Updating image src to public URL: ${publicUrl}`);
                      node.attrs.src = publicUrl;
                      contentModified = true;

                      if (node.attrs['data-storage-path']) {
                        node.attrs['data-storage-path'] = `notes-attachments-public/${filePath}`;
                      }
                      
                      console.log('[syncAttachmentBuckets] Updated private->public image path in note content:', {
                        oldSrc,
                        newSrc: publicUrl,
                        filePath
                      });
                    }
                  } else {
                    // Public -> Private transition - set path directly in src in format {user id}/{note id}/{file name}
                    if (oldSrc.includes('notes-attachments-public/') || oldSrc.startsWith('http')) {
                      // Extract the file name from the path
                      const pathParts = filePath.split('/');
                      const fileName = pathParts[pathParts.length - 1];
                      
                      // Construct the new path in format: {user id}/{note id}/{file name}
                      const userId = pathParts[0];
                      const newPath = `${userId}/${noteId}/${fileName}`;
                      
                      // Set the path directly in src
                      node.attrs.src = newPath;
                      
                      // Remove data-storage-path since we're using src directly
                      if (node.attrs['data-storage-path']) {
                        delete node.attrs['data-storage-path'];
                      }
                      
                      contentModified = true;
                      
                      console.log('[syncAttachmentBuckets] Updated public->private image path in note content:', {
                        oldSrc,
                        newPath: newPath
                      });
                    }
                  }
                }
                
                // Recursively process child nodes
                if (node.content && Array.isArray(node.content)) {
                  updateImagePaths(node.content);
                }
              }
            };
            
            // Update image paths in the content
            updateImagePaths(updatedContent.content || []);
            
            // Only update if content was actually modified
            if (contentModified) {
              try {
                await supabase
                  .from('notes')
                  .update({ 
                    content: updatedContent,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', noteId);
                
                console.log('[syncAttachmentBuckets] Successfully updated note content with new file paths');
              } catch (updateError) {
                console.error('[syncAttachmentBuckets] Error updating note content:', updateError);
                // Continue with other attachments even if content update fails
              }
            }
          }
        }
      } catch (error) {
        console.error(`[syncAttachmentBuckets] Error during attachment sync for ${attachment.id}:`, error);
        throw error;
      }
    }
  } catch (error) {
    const { message, statusCode } = getErrorDetails(error);
    const errorMessage = `[syncAttachmentBuckets] Error syncing attachments: ${message}`;
    
    // Only log as error if it's not a 400/403
    if (statusCode === 400 || statusCode === 403) {
      console.warn(errorMessage, { statusCode, noteId, isPublic });
    } else {
      console.error(errorMessage, { statusCode, noteId, isPublic });
    }
    
    // Return error information instead of throwing
    return { 
      success: false, 
      error: message,
      statusCode
    };
  } finally {
    console.log(`[syncAttachmentBuckets] Completed sync for note ${noteId}`, {
      isPublic,
      startTime,
      endTime: new Date().toISOString()
    });
  }
}
