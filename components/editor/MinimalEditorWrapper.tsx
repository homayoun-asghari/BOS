'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import type { Content } from '@tiptap/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MinimalTiptap } from './minimal-tiptap';
import { useFileUploads } from './hooks/useFileUploads';
import { usePendingLinks } from './hooks/usePendingLinks';

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
  // Create a ref to store the editor instance
  const editorInstance = useRef<Editor | null>(null);

  // File uploads are currently not implemented
  // The hook is kept for future implementation
  useFileUploads({
    editor: editorInstance.current,
    onFileUpload: (url: string, fileName: string, fileType: string, uploadId?: string, isError?: boolean) => {
      console.log('File upload not implemented:', { url, fileName, fileType, uploadId, isError });
    }
  });
  const { processPendingLinks } = usePendingLinks({
    createNoteLink: async (noteId: string) => {
      return `[[${noteId}]]`;
    }
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
    <div className={cn("flex flex-col", className)} style={{ height: '100%' }}>
      <TooltipProvider>
        <div ref={editorRef} className="flex flex-col h-full relative">
          <MinimalTiptap
            value={value}
            onChange={handleChange}
            onInternalLinkClick={onInternalLinkClick}
            onFileUpload={onFileUpload}
            type={type}
            status={status}
            tags={tags}
            onTypeChange={onTypeChange}
            onStatusChange={onStatusChange}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            className="h-full w-full flex-1 overflow-auto relative"
          />
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
      </TooltipProvider>
    </div>
  );
}
