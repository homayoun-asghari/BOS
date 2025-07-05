'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import { uploadFile } from '@/lib/supabase/storage';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StarterKit from '@tiptap/starter-kit';


import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import TurndownService from 'turndown';
import MarkdownIt from 'markdown-it';
// @ts-expect-error - Missing type definitions for markdown-it-link-attributes
import markdownItLinkAttributes from 'markdown-it-link-attributes';
import { ToolbarButton } from '../ui/ToolbarButton';
import { cn } from '@/lib/utils';
// @ts-expect-error - Missing type definitions for internal markdown-it utils in @types/markdown-it
import { isSpace } from 'markdown-it/lib/common/utils';

interface Note {
  id: string;
  title: string;
  isBacklink?: boolean;
}

interface BacklinkData {
  source_note_id: string;
  notes: { title: string }[];
  title: string;
}

// Icons
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  List, 
  ListOrdered, 
  Link as Link2, 
  Image as ImageIcon, 
  Quote, 
  Minus, 
  Undo2, 
  Redo2, 
  Table2,
  RemoveFormatting,
  Search
} from 'lucide-react';

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  isSubmitting?: boolean;
  id?: string;
  onInternalLinkClick?: (noteId: string) => void;
}

// Move these helper functions outside the component to avoid hook rules
const createTurndownService = () => {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
    bulletListMarker: '-',
  });

  service.addRule('link', {
    filter: 'a',
    replacement: (content, node) => {
      const href = (node as HTMLLinkElement).getAttribute('href') || '';
      return `[${content}](${href})`;
    },
  });

  return service;
};

// Make isSpace available globally for markdown-it
const createMarkdownIt = () => {
  // @ts-expect-error - TypeScript doesn't recognize global.isSpace extension
  if (typeof global !== 'undefined' && !global.isSpace) {
    // @ts-expect-error - TypeScript doesn't recognize global.isSpace assignment
    global.isSpace = isSpace;
  }

  return new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true,
    xhtmlOut: true,
  }).use(markdownItLinkAttributes, {
    pattern: /^https?:\/\//,
    attrs: {
      target: '_blank',
      rel: 'noopener noreferrer',
    },
  });
};

// Initialize services once
const turndownService = createTurndownService();
const md = createMarkdownIt();

// Pure functions for conversion
const htmlToMarkdown = (html: string): string => {
  if (!html) return '';
  return turndownService.turndown(html);
};

const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  return md.render(markdown);
};

export function TipTapEditor({ value, onChange, isSubmitting = false, id, onInternalLinkClick }: TipTapEditorProps) {


  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: 'font-bold',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-5',
          },
          itemTypeName: 'listItem',
          keepMarks: true,
          keepAttributes: true,
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-5',
          },
          itemTypeName: 'listItem',
          keepMarks: true,
          keepAttributes: true,
        },
        listItem: {
          HTMLAttributes: {
            class: 'list-item',
          },
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          class: 'text-blue-500 hover:underline',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: markdownToHtml(value),
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      const markdown = htmlToMarkdown(html);
      onChange(markdown);
    },
  });

  const [viewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Filter notes based on search query
  // Filter notes based on search query
  const filteredNotes = useMemo(() => 
    notes.filter((note) => 
      note.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [notes, searchQuery]
  ) as Note[];

  const supabase = useRef(createClient()).current;
  const prevLinkDialogOpen = useRef(isLinkDialogOpen);

  const handleInternalLinkClick = useCallback((noteId: string) => {
    if (onInternalLinkClick) {
      onInternalLinkClick(noteId);
    }
    setIsLinkDialogOpen(false);
  }, [onInternalLinkClick]);

  const focusEditor = useCallback(() => {
    editor?.commands.focus();
  }, [editor]);

  const handleAddLink = useCallback((url: string) => {
    if (!editor) return;

    // If empty, remove the link
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setIsLinkDialogOpen(false);
      setLinkUrl('');
      return;
    }

    // Update link
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run();

    setIsLinkDialogOpen(false);
    setLinkUrl('');
  }, [editor]);

  // Fetch user's notes for internal linking and backlinks
  useEffect(() => {
    const fetchNotes = async () => {
      if (!isLinkDialogOpen) return;

      setIsLoadingNotes(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user's notes
        const { data: notesData, error: notesError } = await supabase
          .from('notes')
          .select('id, title')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (notesError) throw notesError;

        // If we have a note ID, fetch backlinks
        if (id) {
          const { data: backlinksData, error: backlinksError } = await supabase
            .from('backlinks')
            .select('source_note_id, notes!inner(title)')
            .eq('target_note_id', id);

          if (backlinksError) throw backlinksError;

          // Add backlinks to the notes list
          const backlinkedNotes = (backlinksData as BacklinkData[]).map(link => {
            const note = Array.isArray(link.notes) ? link.notes[0] : link.notes;
            return {
              id: link.source_note_id,
              title: `🔗 ${note?.title || 'Untitled Note'}`,
              isBacklink: true
            };
          });

          setNotes([...backlinkedNotes, ...(notesData || [])]);
        } else {
          setNotes(notesData || []);
        }
      } catch (error) {
        console.error('Error fetching notes:', error);
      } finally {
        setIsLoadingNotes(false);
      }
    };

    // Only fetch notes when dialog opens
    if (isLinkDialogOpen && !prevLinkDialogOpen.current) {
      fetchNotes();
    }
    prevLinkDialogOpen.current = isLinkDialogOpen;
  }, [isLinkDialogOpen, supabase, id]);

  // Handle link clicks
  const handleLinkClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a');

    if (link) {
      const href = link.getAttribute('href');

      // Handle internal note links
      if (href?.startsWith('/notes/')) {
        event.preventDefault();
        const noteId = href.split('/').pop();
        if (noteId) {
          handleInternalLinkClick(noteId);
        }
      }
      // Handle external links (open in new tab)
      else if (href?.startsWith('http')) {
        event.preventDefault();
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const { publicUrl } = await uploadFile(file, 'editor');
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      setUploadError(errorMessage);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return;

    try {
      // Show a placeholder while uploading
      const placeholderId = `upload-${Date.now()}`;
      const placeholderSvg = `data:image/svg+xml;base64,${btoa(
        `<svg width="100%" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f5f5f5"/>
          <text x="50%" y="50%" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#999" dy=".3em">Uploading image...</text>
        </svg>`
      )}`;

      // Insert placeholder with proper typing
      editor.chain().focus()
        .setImage({
          src: placeholderSvg,
          alt: 'Uploading image...',
          title: 'Uploading image...',
          'data-upload-id': placeholderId
        } as unknown as { src: string; alt?: string; title?: string; [key: string]: unknown })
        .run();

      // Upload the image
      const imageUrl = await uploadImage(file);

      // Find and update the placeholder image
      const tr = editor.state.tr;
      const doc = tr.doc;
      let found = false;

      // Find and update the placeholder image node
      doc.descendants((node, pos) => {
        if (found) return false;
        
        // Type assertion for node attributes
        const attrs = node.attrs as { src?: string; 'data-upload-id'?: string; [key: string]: unknown };
        
        if (node.type.name === 'image' && attrs['data-upload-id'] === placeholderId) {
          // Create new attributes without the upload ID
          const newAttrs = { ...attrs, src: imageUrl };
          delete newAttrs['data-upload-id'];
          
          // Update the node with the new attributes
          tr.setNodeMarkup(pos, undefined, newAttrs);
          found = true;
          return false;
        }
        return true;
      });
      
      // Apply the transaction if we found and updated the node
      if (found) {
        editor.view.dispatch(tr);
      } else {
        // Fallback if we can't find the placeholder
        editor.chain().focus()
          .setImage({ src: imageUrl })
          .run();
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      // Remove the placeholder on error
      editor.chain().focus()
        .deleteSelection()
        .run();

      // Show error message if available
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      setUploadError(errorMessage);
    }
  }, [editor, uploadImage]);

  const addImage = () => {
    if (!editor) return;

    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    // Handle file selection
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await handleImageUpload(file);
      }
    };

    // Trigger click on the input
    input.click();
  };

  const setLink = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL', previousUrl);

    if (url === null) return;

    handleAddLink(url);
  };

  const addTable = () => {
    if (!editor) return;

    try {
      editor.chain()
        .focus()
        .insertTable({ 
          rows: 3, 
          cols: 3, 
          withHeaderRow: true
        })
        .run();
    } catch (error) {
      console.error('Error adding table:', error);
    }
  };

  const toggleBold = () => {
    if (!editor) return;
    try {
      editor.chain().focus().toggleBold().run();
    } catch (error) {
      console.error('Error toggling bold:', error);
    }
  };

  const toggleItalic = () => {
    if (!editor) return;
    try {
      editor.chain().focus().toggleItalic().run();
    } catch (error) {
      console.error('Error toggling italic:', error);
    }
  };

  const toggleStrike = () => {
    if (!editor) return;
    try {
      editor.chain().focus().toggleStrike().run();
    } catch (error) {
      console.error('Error toggling strike:', error);
    }
  };

  const toggleCode = () => {
    if (!editor) return;
    try {
      editor.chain().focus().toggleCode().run();
    } catch (error) {
      console.error('Error toggling code:', error);
    }
  };

  const toggleBlockquote = () => {
    if (!editor) return;
    try {
      editor.chain().focus().toggleBlockquote().run();
    } catch (error) {
      console.error('Error toggling blockquote:', error);
    }
  };

  const setHorizontalRule = () => {
    if (!editor) return;
    try {
      editor.chain().focus().setHorizontalRule().run();
    } catch (error) {
      console.error('Error setting horizontal rule:', error);
    }
  };

  type Level = 1 | 2 | 3;

  const setHeading = (level: Level) => {
    if (!editor) return;
    try {
      editor.chain().focus().toggleHeading({ level }).run();
    } catch (error) {
      console.error(`Error setting heading ${level}:`, error);
    }
  };

  const canToggleHeading = (level: Level) => {
    if (!editor) return false;
    try {
      return editor.can().toggleHeading({ level });
    } catch (error) {
      console.error(`Error checking heading ${level} availability:`, error);
      return false;
    }
  };

  const toggleBulletList = () => {
    if (!editor) return;
    try {
      editor.chain().focus().toggleBulletList().run();
    } catch (error) {
      console.error('Error toggling bullet list:', error);
    }
  };

  const toggleOrderedList = () => {
    if (!editor) return;
    try {
      editor.chain().focus().toggleOrderedList().run();
    } catch (error) {
      console.error('Error toggling ordered list:', error);
    }
  };

  const undo = () => {
    if (!editor) return;
    try {
      editor.chain().focus().undo().run();
    } catch (error) {
      console.error('Error undoing:', error);
    }
  };

  const redo = () => {
    if (!editor) return;
    try {
      editor.chain().focus().redo().run();
    } catch (error) {
      console.error('Error redoing:', error);
    }
  };

  const clearFormatting = () => {
    if (!editor) return;
    try {
      editor.chain().focus().unsetAllMarks().run();
    } catch (error) {
      console.error('Error clearing formatting:', error);
    }
  };

  const isActive = (name: string, attributes: Record<string, unknown> = {}) => {
    if (!editor) return false;
    try {
      return editor.isActive(name, attributes);
    } catch (error) {
      console.error(`Error checking active state for ${name}:`, error);
      return false;
    }
  };

  const buttons = [
    { 
      icon: <span className="font-bold text-sm">H1</span>, 
      onClick: () => setHeading(1), 
      isActive: isActive('heading', { level: 1 }), 
      disabled: !canToggleHeading(1),
      title: 'Heading 1' 
    },
    { 
      icon: <span className="font-bold text-xs">H2</span>, 
      onClick: () => setHeading(2), 
      isActive: isActive('heading', { level: 2 }), 
      disabled: !canToggleHeading(2),
      title: 'Heading 2' 
    },
    { 
      icon: <span className="text-xs">H3</span>, 
      onClick: () => setHeading(3), 
      isActive: isActive('heading', { level: 3 }), 
      disabled: !canToggleHeading(3),
      title: 'Heading 3' 
    },
    { 
      icon: <Bold size={16} />, 
      onClick: toggleBold, 
      isActive: isActive('bold'), 
      disabled: !editor?.can().toggleBold(),
      title: 'Bold' 
    },
    { 
      icon: <Italic size={16} />, 
      onClick: toggleItalic, 
      isActive: isActive('italic'), 
      disabled: !editor?.can().toggleItalic(),
      title: 'Italic' 
    },
    { 
      icon: <Strikethrough size={16} />, 
      onClick: toggleStrike, 
      isActive: isActive('strike'), 
      disabled: !editor?.can().toggleStrike(),
      title: 'Strikethrough' 
    },
    { 
      icon: <Code size={16} />, 
      onClick: toggleCode, 
      isActive: isActive('code'), 
      disabled: !editor?.can().toggleCode(),
      title: 'Code' 
    },
    { 
      icon: <List size={16} />, 
      onClick: toggleBulletList, 
      isActive: isActive('bulletList'), 
      disabled: !editor?.can().toggleBulletList(),
      title: 'Bullet List' 
    },
    { 
      icon: <ListOrdered size={16} />, 
      onClick: toggleOrderedList, 
      isActive: isActive('orderedList'), 
      disabled: !editor?.can().toggleOrderedList(),
      title: 'Numbered List' 
    },
    { 
      icon: <Table2 size={16} />, 
      onClick: addTable, 
      disabled: !editor?.can().insertTable(),
      title: 'Insert Table' 
    },
    { 
      icon: <Link2 size={16} />, 
      onClick: setLink, 
      isActive: isActive('link'),
      disabled: !editor?.can().setLink({ href: '' }),
      title: 'Add Link' 
    },
    { 
      icon: <ImageIcon size={16} />, 
      onClick: addImage, 
      disabled: !editor,
      title: 'Add Image' 
    },
    { 
      icon: <Quote size={16} />, 
      onClick: toggleBlockquote, 
      isActive: isActive('blockquote'), 
      disabled: !editor?.can().toggleBlockquote(),
      title: 'Blockquote' 
    },
    { 
      icon: <Minus size={16} />, 
      onClick: setHorizontalRule, 
      disabled: !editor?.can().setHorizontalRule(),
      title: 'Horizontal Rule' 
    },
    { 
      icon: <Undo2 size={16} />, 
      onClick: undo, 
      disabled: !editor?.can().undo(), 
      title: 'Undo' 
    },
    { 
      icon: <Redo2 size={16} />, 
      onClick: redo, 
      disabled: !editor?.can().redo(), 
      title: 'Redo' 
    },
    { 
      icon: <RemoveFormatting size={16} />, 
      onClick: clearFormatting, 
      disabled: !editor,
      title: 'Clear Formatting' 
    },
  ];

  // Simple Markdown renderer component
  const MarkdownContent = ({ content }: { content: string }) => (
    <div 
      className="prose dark:prose-invert max-w-none" 
      dangerouslySetInnerHTML={{ __html: content }} 
    />
  );

  if (!editor) {
    return (
      <div className="min-h-[calc(100vh-200px)] border rounded-md bg-background p-4 flex items-center justify-center">
        <div className="animate-pulse">Loading editor...</div>
      </div>
    );
  }

  return (
    <div 
      className="relative"
      onClick={handleLinkClick}
    >
      <div className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border border-border z-10",
        "flex-wrap justify-center max-w-[90%]"
      )}>
        {buttons.map((button, index) => (
          <ToolbarButton
            key={index}
            icon={button.icon}
            onClick={button.onClick}
            isActive={button.isActive}
            disabled={button.disabled || isSubmitting}
            title={button.title}
          />
        ))}
      </div>

      <div className="flex min-h-[calc(100vh-200px)]">
        <div className={cn(
          viewMode === 'split' ? 'w-1/2' : 'w-full',
          'overflow-hidden' // Prevent content from overflowing
        )}>
          <div className="relative w-full h-full overflow-auto bg-background">
            <div 
              className={`border rounded-md p-4 min-h-[300px] ${viewMode === 'split' ? 'border-r border-border' : ''}`} 
              onClick={focusEditor}
            >
              <EditorContent editor={editor} className="prose max-w-none" />
            </div>
            
            {/* Upload status indicators */}
            {isUploading && (
              <div className="absolute bottom-4 right-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
                <svg 
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Uploading...
              </div>
            )}
            
            {uploadError && (
              <div className="absolute bottom-4 right-4 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm flex items-center">
                <svg 
                  className="h-4 w-4 mr-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
                {uploadError}
              </div>
            )}
          </div>
        </div>

        {viewMode !== 'edit' && (
          <div 
            className={cn(
              viewMode === 'split' ? 'w-1/2' : 'w-full',
              'bg-background overflow-auto',
              'border-l border-border',
              'p-4'
            )}
          >
            <MarkdownContent content={editor?.getHTML() || ''} />
          </div>
        )}
      </div>

      {/* Custom Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="external" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="external">External Link</TabsTrigger>
              <TabsTrigger value="internal">Link to Note</TabsTrigger>
            </TabsList>
            
            <TabsContent value="external" className="mt-4">
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLink(linkUrl);
                    }
                  }}
                />
                <Button 
                  onClick={() => handleAddLink(linkUrl)}
                  disabled={!linkUrl.trim()}
                >
                  Apply
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="internal" className="mt-4 space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              {isLoadingNotes ? (
                <div className="text-center py-4">Loading notes...</div>
              ) : filteredNotes.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {searchQuery ? 'No matching notes found' : 'No notes found. Create some notes first.'}
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
                  {filteredNotes.map((note) => (
                    <div 
                      key={note.id}
                      className="p-3 hover:bg-accent cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onInternalLinkClick && note?.id) {
                          onInternalLinkClick(note.id);
                        }
                      }}
                    >
                      <div className="font-medium truncate">{note.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Bubble menu for links */}
      {editor && (
        <BubbleMenu 
          editor={editor} 
          tippyOptions={{ duration: 100 }}
          className="bg-background border rounded-md shadow-lg p-1 flex items-center gap-1"
        >
          {editor.isActive('link') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                editor.chain().focus().unsetLink().run();
              }}
              className="h-8 px-2"
            >
              Remove Link
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const url = editor.getAttributes('link').href;
              setLinkUrl(url || '');
              setIsLinkDialogOpen(true);
            }}
            className="h-8 px-2"
          >
            Edit Link
          </Button>
        </BubbleMenu>
      )}
    </div>
  );
}
