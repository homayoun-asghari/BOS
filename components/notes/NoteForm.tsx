'use client';

import { useState, useCallback, useRef, useEffect, useRef as useReactRef } from 'react';
import { useNoteForm, NoteFormValues } from '@/hooks/useNoteForm';
import { NewTipTapEditor as TipTapEditor, TipTapEditorRef } from '../editor/NewTipTapEditor';
import { saveAttachment } from '@/lib/supabase/attachments';
import { useUser } from '@/hooks/useUser';
import { useTags } from '@/hooks/useTags';

interface NoteItem {
  id: string;
  title: string;
  content?: string;
}

interface NoteFormProps {
  initialData?: Partial<NoteFormValues> & { id?: string };
  onSave?: (data: { id: string; content: string; title: string }) => Promise<void>;
  onContentChange?: (content: string, title: string) => void;
  autoSave?: boolean;
  debounceMs?: number;
  notes?: NoteItem[];
  noteId?: string; // Explicit note ID prop
}

export default function NoteForm({
  initialData = {},
  onSave,
  onContentChange,
  autoSave = true,
  debounceMs = 1000,
  notes = [],
  noteId,
}: NoteFormProps) {
  const [content, setContent] = useState(initialData?.content || '');
  const prevContentRef = useRef(content);
  const isSavingRef = useRef(false);
  const { user } = useUser();
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentNoteId = noteId || initialData?.id;
  
  const { 
    values, 
    isSaving, 
    saveError, 
    handleChange,
    saveNote,
    setSaveError,
    setIsSaving
  } = useNoteForm({
    ...initialData,
    id: initialData?.id || noteId // Use explicit noteId prop if available
  });
  
  // Use the useTags hook to load and manage tags for the current note
  const { tags: loadedTags, addTags: addTagsToNote, removeTags: removeTagsFromNote } = useTags(currentNoteId);
  
  // Sync loaded tags with form state
  useEffect(() => {
    if (loadedTags.length > 0 && JSON.stringify(loadedTags) !== JSON.stringify(values.tags)) {
      handleChange('tags', [...loadedTags]);
    }
  }, [loadedTags, values.tags, handleChange]);
  
  // Refs for editor and pending attachments
  const editorRef = useReactRef<TipTapEditorRef>(null);
  const pendingAttachmentsRef = useRef<Array<{
    userId: string;
    fileName: string;
    fileType?: string;
    fileSize?: number;
    storagePath: string;
  }>>([]);

  const processPendingLinks = useCallback(async (noteId: string) => {
    if (!editorRef.current) return { success: 0, failed: 0 };

    try {
      const result = await editorRef.current.processPendingLinks(noteId);
      return result;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error processing pending links:', error);
      }
      return { success: 0, failed: 0 };
    }
  }, [editorRef]);

  const saveNoteData = useCallback(async (contentToSave: string) => {
    // Allow empty content when cleaning up attachments
    if (contentToSave === undefined) {
      return null;
    }
    
    // Skip if already saving
    if (isSavingRef.current) {
      return null;
    }
    
    // Set the saving lock and update refs
    isSavingRef.current = true;
    const previousContent = prevContentRef.current;

    try {
      setIsSaving(true);
      
      // Process any pending attachments first
      if (pendingAttachmentsRef.current.length > 0) {
        console.log('Processing pending attachments:', pendingAttachmentsRef.current.length);
        const attachments = [...pendingAttachmentsRef.current];
        pendingAttachmentsRef.current = [];
        
        // Process each attachment
        for (const attachment of attachments) {
          try {
            await saveAttachment({
              noteId: currentNoteId!,
              userId: attachment.userId,
              fileName: attachment.fileName,
              fileType: attachment.fileType,
              fileSize: attachment.fileSize,
              storagePath: attachment.storagePath
            });
          } catch (error) {
            console.error('Error saving attachment:', error);
            // Continue with note save even if attachment save fails
          }
        }
      }
      setSaveError(null);
      
      // Save the note content - this will now also sync links
      const savedNote = await saveNote(contentToSave as string);
      
      if (!savedNote) {
        throw new Error('No data returned from save operation');
      }
      
      // Process any pending links and attachments if we have a saved note ID
      if (savedNote.id) {
        try {
          await processPendingLinks(savedNote.id);
          
          // Process any pending attachments
          if (pendingAttachmentsRef.current.length > 0 && user?.id) {
            // Set uploading state while we process attachments
            setIsUploading(true);
            
            try {
              const attachmentPromises = pendingAttachmentsRef.current.map(attachment => 
                saveAttachment({
                  noteId: savedNote.id,
                  userId: user.id,
                  fileName: attachment.fileName,
                  fileType: attachment.fileType,
                  fileSize: attachment.fileSize,
                  storagePath: attachment.storagePath
                })
                .then(() => true)
                .catch(error => {
                  if (process.env.NODE_ENV !== 'production') {
                    console.error('Error saving attachment:', error);
                  }
                  setUploadError(`Failed to save attachment: ${attachment.fileName}`);
                  return false;
                })
              );
              
              // Wait for all attachments to be processed
              const results = await Promise.allSettled(attachmentPromises);
              const successfulSaves = results.filter(r => r.status === 'fulfilled' && r.value).length;
              const failedSaves = results.length - successfulSaves;
              
              console.log(`Attachment save results: ${successfulSaves} succeeded, ${failedSaves} failed`);
              
              if (failedSaves > 0) {
                setSaveError(`Failed to save ${failedSaves} attachment(s). Check the console for details.`);
              }
              
              // Clear pending attachments if all were processed
              if (successfulSaves > 0) {
                pendingAttachmentsRef.current = [];
              }
              
            } finally {
              setIsUploading(false);
            }
            
            console.log('Finished processing pending attachments');
          }
        } catch (linkError) {
          console.error('Error processing pending links or attachments:', linkError);
          setSaveError('Error processing attachments. Some files may not have been saved.');
          // Don't fail the entire save operation if link/attachment processing fails
        }
      }
      
      // Call the parent's onSave callback if provided
      if (onSave && savedNote.id) {
        try {
          const contentString = typeof savedNote.content === 'string' 
            ? savedNote.content 
            : JSON.stringify(savedNote.content || {});
            
          const saveData = {
            id: savedNote.id,
            content: contentString,
            title: savedNote.title || ''
          };
          
          await onSave(saveData as { id: string; content: string; title: string });
        } catch (onSaveError) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Error in onSave callback:', onSaveError);
          }
          // Don't fail the entire save operation if the callback fails
        }
      }
      
      return savedNote;
    } catch (error) {
      // Revert to previous content on error
      prevContentRef.current = previousContent;
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error saving note:', error);
      setSaveError(`Failed to save note: ${errorMessage}`);
      throw error; // Re-throw to let the caller handle it
    } finally {
      // Always reset the saving state
      setIsSaving(false);
      
      // Release the saving lock after a small delay
      // This prevents rapid successive saves
      const releaseLock = () => {
        isSavingRef.current = false;
      };
      
      setTimeout(releaseLock, 500);
    }
  }, [onSave, saveNote, setSaveError, setIsSaving, processPendingLinks, user?.id, currentNoteId]);

  // Function to add a pending attachment
  const addPendingAttachment = useCallback((attachment: {
    userId: string;
    fileName: string;
    fileType?: string;
    fileSize?: number;
    storagePath: string;
  }) => {
    setUploadError(null);
    setIsUploading(true);
    pendingAttachmentsRef.current = [...pendingAttachmentsRef.current, attachment];
    
    // Set a timeout to clear the uploading state after 5 seconds if not cleared
    const timer = setTimeout(() => {
      setIsUploading(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []); // No dependencies needed as we only use state setters and ref

  const handleEditorChange = useCallback((newContent: string) => {
    // Store the previous content for potential rollback
    prevContentRef.current = newContent;
    
    // Update local state
    setContent(newContent);
    
    // Call the parent's onChange handler if provided
    if (onContentChange) {
      const title = values.title || ''; // Ensure title is always a string
      onContentChange(newContent, title);
    }
    
    // Only trigger save if auto-save is enabled
    if (autoSave) {
      // Clear any pending debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set a new debounced save
      saveTimeoutRef.current = setTimeout(() => {
        saveNoteData(newContent).finally(() => {
          // Clear the timeout reference
          saveTimeoutRef.current = null;
        });
      }, debounceMs);
    }
  }, [autoSave, debounceMs, onContentChange, saveNoteData]);
  


  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  // Load notes when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const loadNotes = async () => {
      try {
        // If notes are already provided, we're done
        if (notes && notes.length > 0) {
          if (isMounted) setIsLoadingNotes(false);
          return;
        }
        
        // Otherwise, fetch notes here if needed
        // You can add your note fetching logic here
        // For example:
        // const fetchedNotes = await fetch('/api/notes').then(res => res.json());
        // setNotes(fetchedNotes);
        
      } catch (error) {
        console.error('Error loading notes:', error);
      } finally {
        if (isMounted) setIsLoadingNotes(false);
      }
    };
    
    loadNotes();
    
    return () => {
      isMounted = false;
    };
  }, [notes]);

  const handleTypeChange = (type: string) => {
    handleChange('type', type);
  };

  const handleStatusChange = (status: string) => {
    handleChange('status', status);
  };

  const handleAddTag = async (tag: string) => {
    if (!values.tags.includes(tag)) {
      const newTags = [...values.tags, tag];
      handleChange('tags', newTags);
      
      // Use noteId from props if available, otherwise use values.id
      const targetNoteId = noteId || values.id;
      
      if (targetNoteId) {
        try {
          await addTagsToNote([tag]);
        } catch (error) {
          console.error('Failed to add tag:', error);
          // Revert the UI if the API call fails
          handleChange('tags', values.tags);
        }
      }
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const newTags = values.tags.filter(tag => tag !== tagToRemove);
    handleChange('tags', newTags);
    if (currentNoteId) {
      await removeTagsFromNote([tagToRemove]);
    }
  };

  // Function to handle file uploads
  const handleFileUpload = useCallback((url: string, fileName: string, fileType: string, uploadId?: string, isError?: boolean) => {
    if (isError) {
      setUploadError(`Failed to upload ${fileName}`);
      setIsUploading(false);
      return;
    }

    // If we have a valid note ID, the attachment will be saved normally
    // If not, we'll store it as a pending attachment
    if (!currentNoteId || currentNoteId === 'new') {
      if (user?.id) {
        try {
          // Extract storage path from URL
          const storagePath = url.includes('/storage/v1/object/public/notes-attachments/')
            ? url.split('/storage/v1/object/public/notes-attachments/')[1]
            : url;

          if (!storagePath) {
            throw new Error('Failed to determine storage path from URL');
          }

          // Add to pending attachments
          addPendingAttachment({
            userId: user.id,
            fileName,
            fileType,
            storagePath
          });
          
          console.log(`Added ${fileName} to pending attachments`);
        } catch (error) {
          console.error('Error processing file upload:', error);
          setUploadError(`Error processing ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          // Clear uploading state after a short delay if we're not in the middle of processing
          setTimeout(() => setIsUploading(false), 1000);
        }
      }
    } else {
      // Clear uploading state for direct uploads (handled by FileUploadButton)
      setTimeout(() => setIsUploading(false), 1000);
    }
  }, [currentNoteId, user?.id, addPendingAttachment]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <TipTapEditor
            ref={editorRef}
            value={content}
            onChange={handleEditorChange}
            onFileUpload={handleFileUpload}
            onInternalLinkClick={(noteId) => {
              // Handle internal link click - navigate to the note
              if (noteId && noteId !== currentNoteId) {
                window.open(`/notes/${noteId}`, '_blank');
              }
            }}
            notes={notes}
            isLoading={isLoadingNotes}
            currentNoteId={currentNoteId}
            type={values.type}
            status={values.status}
            tags={loadedTags}
            onTypeChange={handleTypeChange}
            onStatusChange={handleStatusChange}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            createdAt={(() => {
              try {
                const date = values.created_at as string | Date | null | undefined;
                if (!date) return undefined;
                
                // If it's already a valid ISO string, return it
                if (typeof date === 'string' && date.length > 0) {
                  const parsed = new Date(date);
                  return !isNaN(parsed.getTime()) ? date : undefined;
                }
                
                // If it's a Date object, convert to ISO string
                if (date instanceof Date && !isNaN(date.getTime())) {
                  return date.toISOString();
                }
                
                return undefined;
              } catch (e) {
                console.error('Error formatting created_at date:', e);
                return undefined;
              }
            })()}
            updatedAt={(() => {
              try {
                const date = values.updated_at as string | Date | null | undefined;
                if (!date) return undefined;
                
                // If it's already a valid ISO string, return it
                if (typeof date === 'string' && date.length > 0) {
                  const parsed = new Date(date);
                  return !isNaN(parsed.getTime()) ? date : undefined;
                }
                
                // If it's a Date object, convert to ISO string
                if (date instanceof Date && !isNaN(date.getTime())) {
                  return date.toISOString();
                }
                
                return undefined;
              } catch (e) {
                console.error('Error formatting updated_at date:', e);
                return undefined;
              }
            })()}
          />
        </div>
      </div>
      {/* Status and error messages removed as per request */}
    </div>
  );
}
