'use client';

import { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';
import { MinimalEditorWrapper } from './MinimalEditorWrapper';
import { usePendingLinks } from './hooks/usePendingLinks';

export interface NoteItem {
  id: string;
  title: string;
  content?: string;
}

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  isSubmitting?: boolean;
  id?: string;
  onInternalLinkClick?: (noteId: string) => void;
  onFileUpload?: (url: string, fileName: string, fileType: string, uploadId?: string, isError?: boolean) => void;
  notes?: NoteItem[];
  isLoading?: boolean;
  currentNoteId?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  // Tag input props
  type?: string | null;
  status?: string | null;
  tags?: string[];
  onTypeChange?: (type: string) => void;
  onStatusChange?: (status: string) => void;
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
}

export interface TipTapEditorRef {
  processPendingLinks: (noteId: string) => Promise<{success: number, failed: number}>;
  hasPendingLinks: () => boolean;
}

export const NewTipTapEditor = forwardRef<TipTapEditorRef, TipTapEditorProps>(({ 
  value, 
  onChange, 
  onInternalLinkClick,
  onFileUpload,
  currentNoteId,
  // Destructure props here to avoid unused variable warnings
  type,
  status,
  tags,
  onTypeChange: propOnTypeChange,
  onStatusChange: propOnStatusChange,
  onAddTag: propOnAddTag,
  onRemoveTag: propOnRemoveTag,
  // These are used in the MinimalEditorWrapper
  createdAt,
  updatedAt
}, ref) => {

  const { processPendingLinks, hasPendingLinks } = usePendingLinks({
    createNoteLink: async (noteId: string) => `[[${noteId}]]`
  });
  
  // Default handlers
  const handleTypeChange = (typeValue: string) => {
    if (propOnTypeChange) {
      propOnTypeChange(typeValue);
    }
  };
  
  const handleStatusChange = (statusValue: string) => {
    if (propOnStatusChange) {
      propOnStatusChange(statusValue);
    }
  };
  
  const handleAddTag = (tag: string) => {
    if (propOnAddTag) {
      propOnAddTag(tag);
    }
  };
  
  const handleRemoveTag = (tag: string) => {
    if (propOnRemoveTag) {
      propOnRemoveTag(tag);
    }
  };
  const isInitialized = useRef(false);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    processPendingLinks: async (noteId: string) => {
      if (!noteId) return { success: 0, failed: 0 };
      return processPendingLinks(noteId);
    },
    hasPendingLinks: () => hasPendingLinks()
  }), [processPendingLinks, hasPendingLinks]);

  // Process any pending links when the component mounts
  useEffect(() => {
    if (currentNoteId && !isInitialized.current) {
      processPendingLinks(currentNoteId);
      isInitialized.current = true;
    }
  }, [currentNoteId, processPendingLinks]);

  return (
    <div className="h-full w-full">
      <MinimalEditorWrapper
        value={value}
        onChange={onChange}
        onInternalLinkClick={onInternalLinkClick}
        onFileUpload={onFileUpload}
        currentNoteId={currentNoteId}
        type={type}
        status={status}
        tags={tags || []}
        onTypeChange={handleTypeChange}
        onStatusChange={handleStatusChange}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        className="h-full"
        createdAt={createdAt}
        updatedAt={updatedAt}
      />
    </div>
  );
});

NewTipTapEditor.displayName = 'NewTipTapEditor';
