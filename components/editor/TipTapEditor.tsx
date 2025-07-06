'use client';

import { useCallback, useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import useNotes from '@/hooks/useNotes';
import { EditorContent } from '@tiptap/react';
import { useEditorInstance } from './EditorInstance';
import { EditorToolbar } from './EditorToolbar';
import { LinkDialog } from './LinkDialog';
import { MarkdownPreview } from './MarkdownPreview';

interface NoteItem {
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
  currentNoteId?: string; // Current note ID for creating links
}

export interface TipTapEditorRef {
  processPendingLinks: (noteId: string) => Promise<{success: number, failed: number}>;
  hasPendingLinks: () => boolean;
}

export const TipTapEditor = forwardRef<TipTapEditorRef, TipTapEditorProps>(({ 
  value, 
  onChange, 
  onInternalLinkClick,
  onFileUpload,
  notes = [],
  isLoading = false,
  currentNoteId
}, ref) => {
  const { createNoteLink } = useNotes();
  const [isMounted, setIsMounted] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const pendingLinks = useRef<Array<{targetNoteId: string, linkText: string}>>([]);
  const [selectedText, setSelectedText] = useState('');
  
  // Expose a method to process pending links
  const processPendingLinks = useCallback(async (noteId: string) => {
    if (!pendingLinks.current.length) {
      return { success: 0, failed: 0 };
    }
    
    console.log(`Processing ${pendingLinks.current.length} pending links for note ${noteId}`);
    
    const successfulLinks = [];
    const failedLinks = [];
    
    // Process each pending link
    for (const link of pendingLinks.current) {
      try {
        console.log('Creating pending link:', { sourceNoteId: noteId, targetNoteId: link.targetNoteId });
        await createNoteLink(noteId, link.targetNoteId, link.linkText);
        successfulLinks.push(link);
      } catch (error) {
        console.error('Failed to create pending link:', error);
        failedLinks.push(link);
      }
    }
    
    // Remove successfully created links from pending
    pendingLinks.current = failedLinks;
    
    console.log(`Processed pending links: ${successfulLinks.length} succeeded, ${failedLinks.length} failed`);
    
    return {
      success: successfulLinks.length,
      failed: failedLinks.length
    };
  }, [createNoteLink]);
  
  // Expose the processPendingLinks function to parent components
  useImperativeHandle(ref, () => ({
    processPendingLinks,
    hasPendingLinks: () => pendingLinks.current.length > 0
  }), [processPendingLinks]);
  
  // Set isMounted to true after component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true);
    
    // Handle clicks on internal note links
    const handleInternalLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a.internal-note-link') as HTMLAnchorElement;
      
      if (link && onInternalLinkClick) {
        const noteId = link.getAttribute('data-note-id');
        if (noteId) {
          e.preventDefault();
          onInternalLinkClick(noteId);
        }
      }
    };
    
    document.addEventListener('click', handleInternalLinkClick);
    
    return () => {
      setIsMounted(false);
      document.removeEventListener('click', handleInternalLinkClick);
    };
  }, [onInternalLinkClick]);
  
  const editor = useEditorInstance({
    initialContent: value,
    onUpdate: (content: string) => {
      onChange(content);
    },
  });

  const handleAddLink = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    
    // cancelled
    if (url === null) {
      return;
    }
    
    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    
    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // Expose the handleAddLink function for external use
  useImperativeHandle(ref, () => ({
    processPendingLinks,
    hasPendingLinks: () => pendingLinks.current.length > 0,
    addLink: handleAddLink
  }), [processPendingLinks, handleAddLink]);

  const handleInsertTable = useCallback(() => {
    if (!editor) return;
    
    // Insert a 3x3 table by default
    editor.chain().focus().insertTable({
      rows: 3,
      cols: 3,
      withHeaderRow: true,
    }).run();
  }, [editor]);



  const handleInsertLink = useCallback(async (url: string, text: string, isInternal: boolean = false) => {
    if (!editor) return;

    // Get the current selection
    const { state } = editor;
    const { from, to } = state.selection;
    const selectedText = state.doc.textBetween(from, to, ' ');
    
    // Use the selected text as link text if available, otherwise use the provided text or fallback
    const linkText = selectedText.trim() || text || 'Note Link';
    
    // Insert the link into the editor
    if (isInternal) {
      // For internal links, we'll use the note ID as the URL and title as the text
      const noteId = url; // URL is the note ID for internal links
      
      // First, insert the link in the editor
      const chain = editor.chain().focus();
      
      // Only delete selection if we're not using the selected text as link text
      if (!selectedText.trim()) {
        chain.deleteSelection();
      }
      
      chain
        .insertContent({
          type: 'text',
          text: linkText,
          marks: [{
            type: 'link',
            attrs: {
              href: `#${noteId}`,
              'data-note-id': noteId,
              class: 'text-blue-500 hover:underline internal-note-link',
            },
          }],
        })
        .run();
      
      // Handle database link creation if we have a valid currentNoteId
      if (currentNoteId && currentNoteId !== 'new') {
        try {
          // Ensure we're not creating a self-link
          if (currentNoteId === noteId) {
            console.warn('Cannot create a self-link to the same note');
            return;
          }
          
          console.log('Creating note link in database:', { 
            sourceNoteId: currentNoteId, 
            targetNoteId: noteId,
            linkText: linkText
          });
          
          // Create the link in the database
          await createNoteLink(currentNoteId, noteId, linkText);
          console.log('Note link created successfully in database');
        } catch (error) {
          console.error('Failed to create note link in database:', error);
          // The link was still inserted in the editor, so we don't need to show an error to the user
        }
      } else {
        // If the note doesn't have an ID yet, store the link to be created later
        console.log('Note not saved yet, storing link for later creation:', { targetNoteId: noteId, linkText });
        pendingLinks.current.push({ targetNoteId: noteId, linkText });
      }
    } else {
      // Handle external links
      let href = url.trim();
      if (!/^https?:\/\//.test(href)) {
        href = `https://${href}`;
      }
      
      const chain = editor.chain().focus();
      
      // Only delete selection if we're not using the selected text as link text
      if (!selectedText.trim()) {
        chain.deleteSelection();
      }
      
      chain
        .insertContent({
          type: 'text',
          text: linkText,
          marks: [{
            type: 'link',
            attrs: {
              href,
              target: '_blank',
              rel: 'noopener noreferrer',
              class: 'text-blue-500 hover:underline external-link',
            },
          }],
        })
        .run();
    }
    
    // Reset the dialog state
    setSelectedText('');
    setIsLinkDialogOpen(false);
  }, [editor, createNoteLink, currentNoteId]);

  // Handle file uploads from the toolbar
  const handleUpload = useCallback((url: string, fileName: string, fileType: string, uploadId?: string, isError?: boolean) => {
    if (!editor) return;
    
    if (isError) {
      setUploadError(`Failed to upload ${fileName}`);
      setIsUploading(false);
      return;
    }

    // Don't show error for empty URL if we have an uploadId (initial loading state)
    if (!url && !uploadId) {
      console.error('No URL provided for file upload');
      setUploadError('No URL provided for file upload');
      return;
    }
    
    // If URL is empty but we have an uploadId, it's just the initial loading state
    if (!url) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    
    try {
      // Handle image uploads
      if (fileType.startsWith('image/')) {
        // Insert image at the current cursor position
        editor.chain().focus()
          .setImage({ src: url, alt: fileName })
          .run();
      } else {
        // For non-image files, insert a download link
        editor.chain().focus()
          .insertContent({
            type: 'text',
            text: fileName,
            marks: [{
              type: 'link',
              attrs: {
                href: url,
                target: '_blank',
                rel: 'noopener noreferrer',
                class: 'text-blue-500 hover:underline',
                download: fileName
              }
            }]
          })
          .run();
      }
      
      // Call the parent's onFileUpload handler if provided
      if (onFileUpload) {
        onFileUpload(url, fileName, fileType, uploadId, false);
      }
    } catch (error) {
      console.error('Error inserting file into editor:', error);
      setUploadError(`Failed to insert ${fileName} into editor`);
      
      // Still notify parent about the upload if needed
      if (onFileUpload) {
        onFileUpload('', fileName, fileType, uploadId, true);
      }
    } finally {
      setIsUploading(false);
    }
  }, [editor, onFileUpload]);

  return (
    <div className="flex flex-col w-full h-full">
      {/* Toolbar */}
      <EditorToolbar 
        editor={editor} 
        onInsertLink={() => setIsLinkDialogOpen(true)}
        onUpload={handleUpload}
        onInsertTable={handleInsertTable}
        noteId={currentNoteId}
      />

      {/* Editor Content */}
      <div className="flex-1 overflow-auto p-4 relative">
        {isPreview ? (
          <MarkdownPreview content={value} className="min-h-[200px]" />
        ) : (
          <>
            <EditorContent editor={editor} className="h-full" />
            {isUploading && (
              <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span>Uploading...</span>
              </div>
            )}
            {uploadError && (
              <div className="absolute bottom-4 right-4 flex items-center space-x-1 bg-red-100 text-red-800 px-3 py-1.5 rounded-full text-sm">
                <span>⚠️ {uploadError}</span>
                <button 
                  onClick={() => setUploadError(null)}
                  className="text-red-500 hover:text-red-700"
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview Toggle Button */}
      <div className="flex items-center justify-end p-2 border-t">
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-accent"
        >
          {isPreview ? (
            <>
              <EyeOffIcon className="h-4 w-4" />
              Exit Preview
            </>
          ) : (
            <>
              <EyeIcon className="h-4 w-4" />
              Preview
            </>
          )}
        </button>
      </div>

      {/* Link Dialog */}
      <LinkDialog 
        open={isLinkDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedText('');
          }
          setIsLinkDialogOpen(open);
        }}
        selectedText={selectedText}
        onInsertLink={handleInsertLink}
        isLoading={isLoading || !notes?.length}
        currentNoteId={currentNoteId}
      />
    </div>
  );
});

TipTapEditor.displayName = 'TipTapEditor';
