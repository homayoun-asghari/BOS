import * as React from "react"
import "./styles/index.css"

import type { Content, Editor } from "@tiptap/react"
import type { UseMinimalTiptapEditorProps } from "./hooks/use-minimal-tiptap"
import { EditorContent } from "@tiptap/react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { SectionOne } from "./components/section/one"
import { SectionTwo } from "./components/section/two"
import { SectionThree } from "./components/section/three"
import { SectionFour } from "./components/section/four"
import { SectionFive } from "./components/section/five"
import { LinkBubbleMenu } from "./components/bubble-menu/link-bubble-menu"
import { useMinimalTiptapEditor } from "./hooks/use-minimal-tiptap"
import { MeasuredContainer } from "./components/measured-container"
import { InlineTagInput } from "@/components/editor/InlineTagInput"

interface TiptapContent {
  type?: string;
  content?: any[];
  [key: string]: any;
}

export interface MinimalTiptapProps
  extends Omit<UseMinimalTiptapEditorProps, "onUpdate" | "value"> {
  value?: TiptapContent | string | null
  onChange?: (value: TiptapContent) => void
  className?: string
  editorContentClassName?: string
  onInternalLinkClick?: (noteId: string) => void
  onFileUpload?: (url: string, fileName: string, fileType: string, uploadId?: string, isError?: boolean) => void
  noteId?: string
  type?: string | null
  status?: string | null
  tags?: string[]
  onTypeChange?: (type: string) => void
  onStatusChange?: (status: string) => void
  onAddTag?: (tag: string) => void
  onRemoveTag?: (tag: string) => void
  showTagInput?: boolean
}

interface ToolbarProps {
  editor: Editor;
  noteId?: string;
}

const Toolbar = React.memo(({ editor, noteId }: ToolbarProps) => {
  return (
    <div className="w-full overflow-x-auto py-1 scrollbar-hide px-0.5">
      <div className="flex items-center gap-0.5 sm:gap-1 mx-auto w-max">
        <SectionOne editor={editor} activeLevels={[1, 2, 3, 4, 5, 6]} />

        <Separator 
          orientation="vertical" 
          className="mx-1 md:mx-2 h-6 md:h-7 bg-foreground/20 dark:bg-foreground/40 separator" 
        />

        <SectionTwo
          editor={editor}
          activeActions={[
            "bold",
            "italic",
            "underline",
            "strikethrough",
            "code",
            "clearFormatting",
          ]}
          mainActionCount={3}
        />

        <Separator 
          orientation="vertical" 
          className="mx-1 md:mx-2 h-6 md:h-7 bg-foreground/20 dark:bg-foreground/40 separator" 
        />

        <SectionThree editor={editor} />

        <Separator 
          orientation="vertical" 
          className="mx-1 md:mx-2 h-6 md:h-7 bg-foreground/20 dark:bg-foreground/40 separator" 
        />

        <SectionFour
          editor={editor}
          activeActions={["orderedList", "bulletList"]}
          mainActionCount={0}
        />

        <Separator 
          orientation="vertical" 
          className="mx-1 md:mx-2 h-6 md:h-7 bg-foreground/20 dark:bg-foreground/40 separator" 
        />

        <SectionFive
          editor={editor}
          activeActions={["codeBlock", "blockquote", "horizontalRule"]}
          mainActionCount={0}
          noteId={noteId}
        />
      </div>
    </div>
  );
});

// Add responsive styles for the toolbar buttons
const styles = `
  @media (max-width: 640px) {
    .minimal-tiptap-editor .toolbar-button {
      min-width: 36px;
      height: 36px;
      padding: 0 8px;
    }
    .minimal-tiptap-editor .separator {
      height: 24px;
      margin: 0 4px;
    }
  }
`;

// Add the styles to the document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

Toolbar.displayName = 'Toolbar';

export const MinimalTiptapEditor = React.forwardRef<HTMLDivElement, MinimalTiptapProps>(({ 
  value, 
  onChange, 
  className, 
  editorContentClassName, 
  onInternalLinkClick, 
  onFileUpload,
  noteId,
  type,
  status,
  tags = [],
  onTypeChange = () => {},
  onStatusChange = () => {},
  onAddTag = () => {},
  onRemoveTag = () => {},
  showTagInput = true,
  ...props 
}, ref) => {
  const [isHovering, setIsHovering] = React.useState(false);
  const internalRef = React.useRef<HTMLDivElement>(null);
  const hasFocusedRef = React.useRef(false);
  const toolbarRef = React.useRef<HTMLDivElement>(null);
  
  // Merge forwarded ref with internal ref
  React.useImperativeHandle(ref, () => internalRef.current as HTMLDivElement);
  
  const editor = useMinimalTiptapEditor({
    value,
    onUpdate: (content) => {
      try {
        onChange?.(content);
      } catch (error) {
        console.error('Error in onChange handler:', error);
      }
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        // Check if backspace is pressed and cursor is at the start of the document
        if (event.key === 'Backspace' && view.state.selection.$anchor.pos === 1) {
          // Prevent default backspace behavior
          event.preventDefault();
          // Focus the tag input
          if (tagInputRef.current) {
            tagInputRef.current.focus();
          }
          return true; // Handled
        }
        return false; // Let other key events be handled normally
      },
    },
    ...props,
  })

  // Handle clicks on the editor content
  const handleEditorClick = React.useCallback((e: React.MouseEvent) => {
    // Only handle clicks that aren't on the toolbar or its toggle
    const target = e.target as HTMLElement;
    if (toolbarRef.current?.contains(target) || target.closest('[data-toolbar-toggle]')) {
      return;
    }
    // Hide toolbar when clicking on the actual editor content
    if (editor?.view.dom.contains(target)) {
      setIsHovering(false);
    }
    // Focus the editor when clicking in the container
    if (editor && !editor.isFocused) {
      editor.commands.focus();
    }
  }, [editor]);

  // Handle editor and tag input focus
  const tagInputRef = React.useRef<HTMLInputElement>(null);
  const hasTags = tags && tags.length > 0;

  React.useEffect(() => {
    if (editor?.view?.dom && !hasFocusedRef.current) {
      hasFocusedRef.current = true;
      const focusTagInput = () => {
        if (!hasTags && tagInputRef.current) {
          tagInputRef.current.focus();
          return true;
        }
        return false;
      };
      
      // Try to focus tag input first
      const tagInputFocused = focusTagInput();
      
      // If no tag input to focus, focus the editor
      if (!tagInputFocused && editor) {
        requestAnimationFrame(() => {
          editor.commands.focus('start');
        });
      }
    }
  }, [editor, hasTags]);

  if (!editor) {
    return null;
  }


  return (
    <div 
      ref={internalRef}
      className={cn(
        "relative h-full min-h-72 w-full shadow-sm focus-within:ring-1 focus-within:ring-primary/50 flex flex-col",
        className
      )}
      onClick={handleEditorClick}
    >
      {/* Sticky Toolbar Toggle */}
      <div className="sticky-toolbar-container top-0 left-0 right-0 z-50 w-full bg-background/80 backdrop-blur-sm">
        <div className="w-full flex justify-center py-2 relative">
          <div 
            className="h-2 w-16 rounded-full bg-foreground/20 hover:bg-foreground/30 hover:w-20 transition-all duration-200 cursor-pointer touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsHovering(prev => !prev);
            }}
            role="button"
            aria-label="Toggle toolbar"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsHovering(prev => !prev);
              }
            }}
          />
          
          {/* Toolbar */}
          <div 
            ref={toolbarRef}
            className={cn(
              "fixed left-1/2 -translate-x-1/2 z-40 bg-background/95 border border-border rounded-lg shadow-lg transition-all duration-200 w-[85vw] max-w-[500px] overflow-hidden",
              "sm:w-[90vw] sm:max-w-[550px]",
              isHovering ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
            )}
            style={{
              top: 'calc(100% + 0.5rem)',
              WebkitTransform: 'translate3d(-50%, 0, 0)',
              transform: 'translate3d(-50%, 0, 0)',
              WebkitOverflowScrolling: 'touch',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              maxHeight: '70vh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-x-auto py-1 px-1.5 touch-pan-x">
              <Toolbar editor={editor} noteId={noteId} />
            </div>
          </div>
        </div>
      </div>
      {/* Editor Content */}
      <div className="relative flex-1 overflow-y-auto pt-2">
        <div className="min-h-full">
          {/* Inline Tag Input - Conditionally rendered based on showTagInput prop */}
          {showTagInput !== false && (
            <div className="py-2 bg-background" onClick={(e) => e.stopPropagation()}>
              <InlineTagInput
                ref={tagInputRef}
                noteId={noteId}
                type={type}
                status={status}
                tags={tags}
                onTypeChange={onTypeChange}
                onStatusChange={onStatusChange}
                onAddTag={onAddTag}
                onRemoveTag={onRemoveTag}
                onEnterPress={() => {
                  if (editor) {
                    // Focus the editor at the start of the first line
                    editor.commands.focus('start');
                    // Move cursor to the beginning of the document
                    editor.commands.setTextSelection(0);
                  }
                }}
              />
            </div>
          )}
          
          <div className={cn(
            "minimal-tiptap-editor min-h-full w-full p-0 m-0",
            editorContentClassName
          )}>
            <EditorContent
              editor={editor}
              className="h-full w-full"
              style={{
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                padding: 0,
                margin: 0
              }}
            />
          </div>
          <LinkBubbleMenu editor={editor} />
        </div>
      </div>
    </div>
  )
})

MinimalTiptapEditor.displayName = "MinimalTiptapEditor"

export default MinimalTiptapEditor
