import { Editor } from '@tiptap/react';
import { ToolbarButton } from '../ui/ToolbarButton';
import { FileUploadButton } from './FileUploadButton';

// Icons
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  List, 
  ListOrdered, 
  Link2, 
  Paperclip,
  Table, 
  Minus,
  Undo2,
  Redo2,
  Code2,
  Quote,
  Heading1,
  Heading2,
  Heading3,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
  onInsertLink: () => void;
  onUpload: (fileUrl: string, fileName: string, fileType: string, uploadId?: string, isError?: boolean) => void;
  onInsertTable: () => void;
  noteId?: string;
}

export function EditorToolbar({ 
  editor, 
  onInsertLink, 
  onUpload,
  onInsertTable,
  noteId,
}: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border p-1">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
        icon={<Bold className="h-4 w-4" />}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
        icon={<Italic className="h-4 w-4" />}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
        icon={<Strikethrough className="h-4 w-4" />}
      />
      <div className="mx-1 h-6 w-px bg-border" />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
        icon={<Heading1 className="h-4 w-4" />}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
        icon={<Heading2 className="h-4 w-4" />}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
        icon={<Heading3 className="h-4 w-4" />}
      />
      <div className="mx-1 h-6 w-px bg-border" />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
        icon={<List className="h-4 w-4" />}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
        icon={<ListOrdered className="h-4 w-4" />}
      />
      <div className="mx-1 h-6 w-px bg-border" />
      <ToolbarButton
        onClick={() => {
          // ✅ Fixed: inline code instead of block code
          editor.chain().focus().toggleCode().run();
        }}
        isActive={editor.isActive('code')}
        title="Code"
        icon={<Code2 className="h-4 w-4" />}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Blockquote"
        icon={<Quote className="h-4 w-4" />}
      />
      <div className="mx-1 h-6 w-px bg-border" />
      <ToolbarButton
        onClick={onInsertLink}
        isActive={editor.isActive('link')}
        title="Insert Link"
        icon={<Link2 className="h-4 w-4" />}
      />
      <FileUploadButton
        onUpload={onUpload}
        noteId={noteId}
        accept="*/*"
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-0"
        title="Upload File or Image"
        aria-label="Upload file or image"
      >
        <Paperclip className="h-4 w-4" />
      </FileUploadButton>
      <ToolbarButton
        onClick={onInsertTable}
        isActive={false}
        title="Insert Table"
        icon={<Table className="h-4 w-4" />}
      />
      <div className="mx-1 h-6 w-px bg-border" />
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Insert Horizontal Rule"
        icon={<Minus className="h-4 w-4" />}
      />
      <div className="flex-1" />
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        isActive={false}
        title="Undo"
        icon={<Undo2 className="h-4 w-4" />}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        isActive={false}
        title="Redo"
        icon={<Redo2 className="h-4 w-4" />}
      />
    </div>
  );
}
