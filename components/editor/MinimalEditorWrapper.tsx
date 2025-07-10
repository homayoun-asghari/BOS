'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Content } from '@tiptap/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MinimalTiptap } from './minimal-tiptap';
import { usePendingLinks } from './hooks/usePendingLinks';
import { useEditorUpload } from '@/hooks/useEditorUpload';

interface MinimalEditorWrapperProps {
  value: string;
  onChange: (value: string) => void;
  currentNoteId?: string;
  className?: string;
  onInternalLinkClick?: (noteId: string) => void;
  onFileUpload?: (url: string, fileName: string, fileType: string, uploadId?: string, isError?: boolean) => void;
  // Tag input props
  type?: string | null;
  status?: string | null;
  tags?: string[];
  onTypeChange?: (type: string) => void;
  onStatusChange?: (status: string) => void;
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export function MinimalEditorWrapper({
  value,
  onChange,
  currentNoteId,
  className,
  onInternalLinkClick,
  onFileUpload,
  type,
  status,
  tags = [],
  onTypeChange = () => {},
  onStatusChange = () => {},
  onAddTag = () => {},
  onRemoveTag = () => {},
  createdAt,
  updatedAt,
}: MinimalEditorWrapperProps) {
  // Initialize file upload handler
  const { uploadFile } = useEditorUpload(currentNoteId);

  // Create the uploader function that will be passed to the editor
  const uploader = useCallback(async (file: File) => {
    const uploadId = Math.random().toString(36).substring(2, 9);
    if (!currentNoteId) {
      const error = new Error('Cannot upload file: No note ID provided');
      onFileUpload?.('', file.name, file.type || 'application/octet-stream', uploadId, true);
      throw error;
    }
    
    try {
      const result = await uploadFile(file);
      
      // Notify parent component of successful upload
      onFileUpload?.(result.url, result.fileName, result.fileType, uploadId, false);
      
      // Return the public URL to be used in the editor
      return result.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Error is handled by the error boundary and onFileUpload callback
      
      onFileUpload?.(
        '', 
        file.name, 
        file.type || 'application/octet-stream', 
        uploadId, 
        true
      );
      
      throw error;
    }
  }, [currentNoteId, uploadFile, onFileUpload]);
  
  // Handle file upload notifications from the editor
  const handleFileUploadNotification = useCallback((url: string, fileName: string, fileType: string, uploadId?: string, isError?: boolean) => {
    // This is just a notification, no need to return anything
    onFileUpload?.(url, fileName, fileType, uploadId, isError);
  }, [onFileUpload]);

  const { processPendingLinks } = usePendingLinks({
    createNoteLink: async (noteId: string) => `[[${noteId}]]`
  });

  const isInitialized = useRef(false);

  // Process any pending links when the component mounts
  useEffect(() => {
    if (currentNoteId && !isInitialized.current) {
      isInitialized.current = true;
      processPendingLinks(currentNoteId);
    }
  }, [currentNoteId, processPendingLinks]);

  // Handle editor content changes
  const handleChange = useCallback((content: Content) => {
    if (content === null || content === undefined) {
      onChange('');
    } else if (typeof content === 'string') {
      onChange(content);
    } else if (typeof content === 'object' && 'type' in content) {
      // Handle JSON content
      onChange(JSON.stringify(content));
    }
  }, [onChange]);

  // Create a ref to store the editor div element
  const editorRef = useRef<HTMLDivElement>(null);

  // Format timestamps with robust error handling
  const formatTimestamp = (dateString?: string | null) => {
    if (!dateString) return '';
    
    try {
      // Handle cases where dateString might already be a Date object (in case of direct prop passing)
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date value:', dateString);
        return '';
      }
      
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  };

  return (
    <div className={cn("flex flex-col w-full", className)} style={{ height: '100%', maxWidth: '100%' }}>
      <style jsx global>{`
        .ProseMirror {
          padding: 0 !important;
        }
      `}</style>
      <TooltipProvider>
        <div ref={editorRef} className="flex flex-col h-full relative">
          <div className="relative h-full w-full max-w-full overflow-x-hidden">
            <MinimalTiptap
              value={value}
              onChange={handleChange}
              onInternalLinkClick={onInternalLinkClick}
              onFileUpload={handleFileUploadNotification}
              uploader={uploader}
              noteId={currentNoteId}
              type={type}
              status={status}
              tags={tags}
              onTypeChange={onTypeChange}
              onStatusChange={onStatusChange}
              onAddTag={onAddTag}
              onRemoveTag={onRemoveTag}
              className={cn(
                'h-full w-full max-w-full',
                'prose dark:prose-invert prose-sm sm:prose-base !max-w-none !px-0 !mx-0 [&>*]:!px-0 !pl-0 !pr-0',
                'prose-headings:font-medium prose-p:my-2 prose-ul:my-2 prose-ol:my-2',
                'prose-blockquote:not-italic',
                'prose-pre:bg-muted/50 prose-pre:rounded-lg prose-pre:px-0 prose-pre:py-4',
                'prose-code:before:hidden prose-code:after:hidden',
                'prose-code:bg-muted/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-foreground/80',
                'prose-code:font-normal',
                'prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
                'prose-h1:font-semibold prose-h2:font-semibold prose-h3:font-semibold',
                'prose-h1:mt-6 prose-h2:mt-5 prose-h3:mt-4',
                'prose-h1:mb-3 prose-h2:mb-2 prose-h3:mb-2',
                'prose-h1:border-b prose-h1:pb-2 prose-h1:border-border',
                'prose-h2:border-b prose-h2:pb-1 prose-h2:border-border/50',
                'prose-h3:border-b prose-h3:pb-1 prose-h3:border-border/30',
                'prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:py-0.5',
                'prose-blockquote:bg-muted/30 prose-blockquote:not-italic',
                'prose-ul:list-disc prose-ol:list-decimal prose-li:my-0.5 prose-li:pl-0',
                'prose-ul:pl-0 prose-ol:pl-0',
                'prose-table:border-collapse prose-table:w-full prose-table:my-4',
                'prose-th:bg-muted/50 prose-th:py-2 prose-th:border prose-th:border-border',
                'prose-td:py-2 prose-td:border prose-td:border-border',
                'prose-hr:my-4 prose-hr:border-border/50',
                'prose-img:rounded-lg prose-img:border prose-img:border-border',
                'focus:outline-none',
                '[&_.ProseMirror]:!p-0 [&_.ProseMirror]:w-full [&_.ProseMirror]:max-w-full',
                '[&_.ProseMirror>*]:!p-0 [&_.ProseMirror>*]:w-full [&_.ProseMirror>*]:max-w-full',
                '[&_.ProseMirror_p]:!px-0 [&_.ProseMirror_ul]:!px-0 [&_.ProseMirror_ol]:!px-0',
                className
              )}
            />
          </div>
        </div>
      </TooltipProvider>
      {(createdAt || updatedAt) && (
        <div className="border-t p-2 text-right text-xs text-muted-foreground">
          {createdAt && (
            <span>Created: {formatTimestamp(createdAt)}</span>
          )}
          {updatedAt && updatedAt !== createdAt && (
            <span className="ml-2">• Updated: {formatTimestamp(updatedAt)}</span>
          )}
        </div>
      )}
    </div>
  );
}
