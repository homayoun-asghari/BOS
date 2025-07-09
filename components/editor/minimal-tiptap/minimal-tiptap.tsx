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
  // Tag input props
  type?: string | null
  status?: string | null
  tags?: string[]
  onTypeChange?: (type: string) => void
  onStatusChange?: (status: string) => void
  onAddTag?: (tag: string) => void
  onRemoveTag?: (tag: string) => void
}

const Toolbar = React.memo(({ editor }: { editor: Editor }) => {
  return (
    <div className="shrink-0 overflow-x-auto px-4 py-3">
      <div className="flex w-max items-center gap-1">
        <SectionOne editor={editor} activeLevels={[1, 2, 3, 4, 5, 6]} />

        <Separator orientation="vertical" className="mx-2 h-7 bg-foreground/20 dark:bg-foreground/40" />

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

        <Separator orientation="vertical" className="mx-2 h-7 bg-foreground/20 dark:bg-foreground/40" />

        <SectionThree editor={editor} />

        <Separator orientation="vertical" className="mx-2 h-7 bg-foreground/20 dark:bg-foreground/40" />

        <SectionFour
          editor={editor}
          activeActions={["orderedList", "bulletList"]}
          mainActionCount={0}
        />

        <Separator orientation="vertical" className="mx-2 h-7 bg-foreground/20 dark:bg-foreground/40" />

        <SectionFive
          editor={editor}
          activeActions={["codeBlock", "blockquote", "horizontalRule"]}
          mainActionCount={0}
        />
      </div>
    </div>
  );
});

Toolbar.displayName = 'Toolbar';

export const MinimalTiptapEditor = React.forwardRef<HTMLDivElement, MinimalTiptapProps>(({ 
  value, 
  onChange, 
  className, 
  editorContentClassName, 
  onFileUpload,
  type,
  status,
  tags = [],
  onTypeChange = () => {},
  onStatusChange = () => {},
  onAddTag = () => {},
  onRemoveTag = () => {},
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
      onChange?.(content);
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
        "group relative flex h-full min-h-72 w-full flex-col shadow-sm focus-within:ring-1 focus-within:ring-primary/50",
        className
      )}
      onClick={(e) => {
        // Hide toolbar when clicking on the editor on mobile, or when not hovering toolbar on desktop
        if (window.innerWidth < 640 || 
            (toolbarRef.current && !toolbarRef.current.contains(e.target as Node))) {
          setIsHovering(false);
        }
        // Focus the editor when clicking anywhere in the container
        if (editor && !editor.isFocused) {
          editor.commands.focus();
        }
      }}
      onTouchStart={(e) => {
        // On mobile, only hide toolbar if clicking outside the toolbar
        if (window.innerWidth < 640 && 
            toolbarRef.current && 
            !toolbarRef.current.contains(e.target as Node)) {
          setIsHovering(false);
        }
      }}
    >
      {/* Toolbar Container */}
      <div className="sticky top-0 z-30 w-full flex flex-col items-center">
        {/* Slider Edge - Only shows toolbar on hover */}
        <div className="w-full h-8 flex justify-center items-start touch-none">
          <div 
            className="h-2 w-16 rounded-full bg-foreground/20 hover:bg-foreground/30 hover:w-20 transition-all duration-200 cursor-pointer"
            onMouseEnter={() => setIsHovering(true)}
            onClick={(e) => {
              e.stopPropagation();
              if (window.innerWidth < 640) { // sm breakpoint
                setIsHovering(true);
              } else {
                setIsHovering(prev => !prev);
              }
            }}
          />
        </div>
        
        {/* Toolbar */}
        <div 
          ref={toolbarRef}
          className={cn(
            "z-20 overflow-x-auto overflow-y-hidden transition-all duration-200 ease-in-out bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border border-border rounded-lg my-2 w-full sm:w-max max-w-full",
            isHovering ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
          onMouseEnter={() => setIsHovering(true)}
        >
          <div className="w-max min-w-full sm:min-w-0 px-2 sm:px-0">
            <Toolbar editor={editor} />
          </div>
        </div>
      </div>
      
      {/* Inline Tag Input - Moved to top */}
      <div className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
        <InlineTagInput
          ref={tagInputRef}
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
      
      {/* Editor Content */}
      <div className="relative flex-1">
        <EditorContent
          editor={editor}
          className={cn(
            "minimal-tiptap-editor h-full w-full",
            editorContentClassName
          )}
        />
        <LinkBubbleMenu editor={editor} />
      </div>
    </div>
  )
})

MinimalTiptapEditor.displayName = "MinimalTiptapEditor"

export default MinimalTiptapEditor
