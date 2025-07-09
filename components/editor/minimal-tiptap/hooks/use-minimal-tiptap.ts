import * as React from "react"
import type { Editor } from "@tiptap/react"
import type { Content, UseEditorOptions } from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import { useEditor } from "@tiptap/react"
import { Typography } from "@tiptap/extension-typography"
import { Placeholder } from "@tiptap/extension-placeholder"
import { Underline } from "@tiptap/extension-underline"
import { TextStyle } from "@tiptap/extension-text-style"
import {
  Link,
  Image,
  HorizontalRule,
  CodeBlockLowlight,
  Selection,
  Color,
  UnsetAllMarks,
  ResetMarksOnEnter,
  FileHandler,
} from "../extensions"
import { Highlight } from "../extensions/highlight/highlight"
import { cn } from "@/lib/utils"
import { fileToBase64, getOutput, randomId } from "../utils"
import { useThrottle } from "../hooks/use-throttle"
import { toast } from "sonner"

export interface TiptapContent {
  type?: string;
  content?: any[];
  [key: string]: any;
}

export interface UseMinimalTiptapEditorProps extends Omit<UseEditorOptions, 'content' | 'onUpdate' | 'onBlur'> {
  value?: TiptapContent | string | null
  output?: "html" | "json" | "text"
  placeholder?: string
  editorClassName?: string
  throttleDelay?: number
  onUpdate?: (content: TiptapContent) => void
  onBlur?: (content: TiptapContent) => void
  onFileUpload?: (url: string, fileName: string, fileType: string, uploadId?: string, isError?: boolean) => void
  uploader?: (file: File) => Promise<string>
}

async function fakeuploader(file: File): Promise<string> {
  // NOTE: This is a fake upload function. Replace this with your own upload logic.
  // This function should return the uploaded image URL.

  // wait 3s to simulate upload
  await new Promise((resolve) => setTimeout(resolve, 3000))

  const src = await fileToBase64(file)

  return src
}

const createExtensions = ({
  placeholder,
  uploader,
  onFileUpload,
}: {
  placeholder: string
  uploader?: (file: File) => Promise<string>
  onFileUpload?: (url: string, fileName: string, fileType: string, uploadId?: string, isError?: boolean) => void
}) => [
  StarterKit.configure({
    horizontalRule: false,
    codeBlock: false,
    paragraph: { HTMLAttributes: { class: "text-node" } },
    heading: { HTMLAttributes: { class: "heading-node" } },
    blockquote: { HTMLAttributes: { class: "block-node" } },
    bulletList: { HTMLAttributes: { class: "list-node" } },
    orderedList: { HTMLAttributes: { class: "list-node" } },
    code: { HTMLAttributes: { class: "inline", spellcheck: "false" } },
    dropcursor: { width: 2, class: "ProseMirror-dropcursor border" },
  }),
  Link,
  Underline,
  Image.configure({
    allowedMimeTypes: ["image/*"],
    maxFileSize: 5 * 1024 * 1024,
    allowBase64: true,
    uploadFn: async (file) => {
      return uploader ? await uploader(file) : await fakeuploader(file)
    },
    onToggle(editor, files, pos) {
      editor.commands.insertContentAt(
        pos,
        files.map((image) => {
          const blobUrl = URL.createObjectURL(image)
          const id = randomId()

          return {
            type: "image",
            attrs: {
              id,
              src: blobUrl,
              alt: image.name,
              title: image.name,
              fileName: image.name,
            },
          }
        })
      )
    },
    onImageRemoved({ id, src }) {
      console.log("Image removed", { id, src })
    },
    onValidationError(errors) {
      errors.forEach((error) => {
        toast.error("Image validation error", {
          position: "bottom-right",
          description: error.reason,
        })
      })
    },
    onActionSuccess({ action }) {
      const mapping = {
        copyImage: "Copy Image",
        copyLink: "Copy Link",
        download: "Download",
      }
      toast.success(mapping[action], {
        position: "bottom-right",
        description: "Image action success",
      })
    },
    onActionError(error, { action }) {
      const mapping = {
        copyImage: "Copy Image",
        copyLink: "Copy Link",
        download: "Download",
      }
      toast.error(`Failed to ${mapping[action]}`, {
        position: "bottom-right",
        description: error.message,
      })
    },
  }),
  FileHandler.configure({
    onPaste: (editor, files) => {
      files.forEach(async (file) => {
        try {
          const src = await (uploader ?? fakeuploader)(file);
          const node = editor.schema.nodes.image.create({ src });
          const transaction = editor.state.tr;
          transaction.replaceSelectionWith(node);
          editor.view.dispatch(transaction);
          
          if (onFileUpload) {
            onFileUpload(src, file.name, file.type);
          }
        } catch (error) {
          console.error('Error uploading file:', error);
          if (onFileUpload) {
            onFileUpload('', file.name, file.type, undefined, true);
          }
        }
      });
    },
    onDrop: (editor, files, pos) => {
      files.forEach(async (file) => {
        try {
          const src = await (uploader ?? fakeuploader)(file);
          const node = editor.schema.nodes.image.create({ src });
          const transaction = editor.state.tr;
          transaction.insert(pos, node);
          editor.view.dispatch(transaction);
          if (onFileUpload) {
            onFileUpload(src, file.name, file.type);
          }
        } catch (error) {
          console.error('Error uploading file:', error);
          if (onFileUpload) {
            onFileUpload('', file.name, file.type, undefined, true);
          }
        }
      });
    },
    onValidationError: (errors) => {
      errors.forEach((error) => {
        toast.error("Image validation error", {
          position: "bottom-right",
          description: error.reason,
        })
      })
    },
  }),
  Color,
  TextStyle,
  Highlight,
  Selection,
  Typography,
  UnsetAllMarks,
  HorizontalRule,
  ResetMarksOnEnter,
  CodeBlockLowlight,
  Placeholder.configure({ placeholder: () => placeholder }),
]

export const useMinimalTiptapEditor = ({
  value,
  output = "json",
  placeholder = "",
  editorClassName,
  throttleDelay = 0,
  onUpdate,
  onBlur,
  onFileUpload,
  uploader = fakeuploader,
  ...props
}: UseMinimalTiptapEditorProps) => {
  const throttledSetValue = useThrottle(
    (value: TiptapContent) => onUpdate?.(value),
    throttleDelay
  )

  const handleUpdate = React.useCallback(
    (editor: Editor) => {
      try {
        // Always get JSON output to maintain consistent structure
        const content = editor.getJSON();
        if (content) {
          // Ensure we're not double-wrapping the content
          if (output === 'json') {
            throttledSetValue(content);
          } else {
            throttledSetValue(getOutput(editor, output) as TiptapContent);
          }
        }
      } catch (error) {
        console.error('Error in editor update:', error);
      }
    },
    [output, throttledSetValue]
  )

  const handleCreate = React.useCallback(
    (editor: Editor) => {
      if (!value) return;
      
      try {
        // If value is a string, try to parse it as JSON
        const content = typeof value === 'string' 
          ? JSON.parse(value)
          : value;
          
        // Only set content if the editor is empty to prevent overwriting existing content
        if (editor.isEmpty) {
          editor.commands.setContent(content);
        }
      } catch (error) {
        console.error('Error setting editor content:', error);
        // If parsing fails, set as plain text
        if (editor.isEmpty) {
          editor.commands.setContent([{
            type: 'paragraph',
            content: [{ type: 'text', text: String(value) }]
          }]);
        }
      }
    },
    [value]
  )

  const handleBlur = React.useCallback(
    (editor: Editor) => {
      try {
        // Always get JSON output to maintain consistent structure
        const content = editor.getJSON();
        if (content) {
          // Ensure we're not double-wrapping the content
          if (output === 'json') {
            onBlur?.(content);
          } else {
            onBlur?.(getOutput(editor, output) as TiptapContent);
          }
        }
      } catch (error) {
        console.error('Error in editor blur:', error);
      }
    },
    [output, onBlur]
  )

  const editor = useEditor({
    extensions: createExtensions({ 
      placeholder, 
      uploader,
      onFileUpload
    }),
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        class: cn("focus:outline-none", editorClassName),
      },
    },
    onUpdate: ({ editor }) => handleUpdate(editor),
    onCreate: ({ editor }) => handleCreate(editor),
    onBlur: ({ editor }) => handleBlur(editor),
    ...props,
  })

  return editor
}

export default useMinimalTiptapEditor
