import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { toMarkdown, toHtml } from '@/lib/markdown';
import { useEffect, useRef } from 'react';
import { CustomImage } from './extensions/CustomImage';

interface UseEditorInstanceProps {
  initialContent: string;
  onUpdate: (content: string) => void;
}

export function useEditorInstance({ initialContent, onUpdate }: UseEditorInstanceProps) {
  // Keep track of whether we're updating to prevent loops
  const isUpdating = useRef(false);
  
  // Convert initial markdown to HTML for the editor
  const initialHtml = initialContent ? toHtml(initialContent) : '';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: {
            class: 'font-bold',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'rounded-md bg-muted p-4 font-mono text-sm',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'my-2',
          },
        },
      }),
      CustomImage.configure({
        HTMLAttributes: {
          class: 'rounded-md max-w-full h-auto',
        },
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: {
          class: 'text-blue-500 hover:underline',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        validate: (url) => /^https?:\/\//.test(url),
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialHtml,
    onUpdate: ({ editor }) => {
      if (isUpdating.current) return;
      
      try {
        isUpdating.current = true;
        // Get the current HTML content and convert to Markdown for saving
        const html = editor.getHTML();
        const markdown = toMarkdown(html);
        // Pass the Markdown content back to the parent
        onUpdate(markdown);
      } finally {
        isUpdating.current = false;
      }
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none p-4 min-h-[200px] editor-content',
      },
      handleClick: (view, pos, event) => {
        // Handle link clicks manually to support internal links
        const target = (event.target as HTMLElement).closest('a');
        if (target) {
          const href = target.getAttribute('href');
          if (href && href.startsWith('http')) {
            // External links open in new tab
            window.open(href, '_blank', 'noopener,noreferrer');
            return true;
          }
          // Let internal links be handled by the parent component
        }
        return false;
      },
    },
  });

  // Update editor content when initialContent changes
  useEffect(() => {
    if (!editor || isUpdating.current) return;
    
    const currentContent = editor.getHTML();
    const newHtml = initialContent ? toHtml(initialContent) : '';
    
    if (currentContent !== newHtml) {
      isUpdating.current = true;
      editor.commands.setContent(newHtml);
      isUpdating.current = false;
    }
  }, [initialContent, editor]);

  return editor;
}
