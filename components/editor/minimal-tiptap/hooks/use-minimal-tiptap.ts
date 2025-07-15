import * as React from "react"
import type { Editor } from "@tiptap/react"
import type { UseEditorOptions as TiptapUseEditorOptions } from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import { useEditor } from "@tiptap/react"

// Extend the base UseEditorOptions to include immediatelyRender
interface UseEditorOptions extends TiptapUseEditorOptions {
  immediatelyRender?: boolean;
}
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
import { Node as ProseMirrorNode } from 'prosemirror-model';

export interface TiptapContent {
  type?: string;
  content?: unknown[];
  [key: string]: unknown;
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
      const uploadId = randomId();
      try {
        const url = uploader ? await uploader(file) : await fakeuploader(file);
        return url;
      } catch {
        const errorMessage = `[Tiptap Image] Upload failed for file: ${file.name}`;
        console.error(errorMessage, { 
          fileName: file.name, 
          uploadId
        });
        throw new Error(errorMessage);
      }
    },
    onToggle(editor, files, pos) {
      editor.commands.insertContentAt(
        pos,
        files.map((image) => {
          const blobUrl = URL.createObjectURL(image);
          const id = randomId();
          const uploadId = `upload-${id}`;
          
          // Notify about the upload start
          onFileUpload?.(blobUrl, image.name, image.type, uploadId, false);
          
          // Start the upload process
          (uploader ? uploader(image) : fakeuploader(image))
            .then(finalUrl => {
              if (!finalUrl) {
                onFileUpload?.('', image.name, image.type, uploadId, true);
                return;
              }
              
              // Update the image source when upload is complete
              editor.commands.command(({ tr }) => {
                let foundPos: number | null = null;
                
                tr.doc.descendants((node: ProseMirrorNode, pos: number) => {
                  if (node.attrs?.id === id) {
                    foundPos = pos;
                    return false; // Stop searching
                  }
                  return true;
                });
                
                if (foundPos !== null) {
                  const node = tr.doc.nodeAt(foundPos);
                  if (node) {
                    tr.setNodeMarkup(tr.mapping.map(foundPos), undefined, {
                      ...node.attrs,
                      src: finalUrl,
                      'data-upload-complete': 'true'
                    });
                    return true;
                  }
                }
                return false;
              });
              
              // Notify about the successful upload completion
              onFileUpload?.(finalUrl, image.name, image.type, uploadId, false);
            })
            .catch(() => {
              // Notify about the upload failure
              onFileUpload?.('', image.name, image.type, uploadId, true);
            });

          return {
            type: "image",
            attrs: {
              id,
              src: blobUrl,
              'data-upload-id': uploadId,
              'data-upload-complete': 'false',
              alt: image.name,
              title: image.name,
              fileName: image.name,
            },
          }
        })
      )
    },
    onImageRemoved() {
      // Image removed handler
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
        const uploadId = randomId();
        try {
          // Show temporary placeholder
          const tempNode = editor.schema.nodes.image.create({
            src: '',
            'data-uploading': 'true',
            'data-upload-id': uploadId,
            alt: file.name,
            title: file.name,
          });
          
          const transaction = editor.state.tr;
          transaction.replaceSelectionWith(tempNode);
          editor.view.dispatch(transaction);
          
          // Start upload
          const src = await (uploader ?? fakeuploader)(file);
          
          // Find and replace the temporary node
          const doc = editor.state.doc;
          let foundPos = -1;
          
          doc.descendants((node, pos) => {
            if (node.attrs['data-upload-id'] === uploadId) {
              foundPos = pos;
              return false; // Stop searching
            }
            return true;
          });
          
          if (foundPos >= 0) {
            const transaction = editor.state.tr;
            transaction.setNodeMarkup(foundPos, undefined, {
              ...doc.nodeAt(foundPos)?.attrs,
              src,
              'data-uploading': undefined,
            });
            editor.view.dispatch(transaction);
          }
          
          if (onFileUpload) {
            onFileUpload(src, file.name, file.type, uploadId, false);
          }
        } catch {
          console.error('Error uploading file');
          
          // Remove the temporary node if upload fails
          const doc = editor.state.doc;
          let foundPos = -1;
          
          doc.descendants((node, pos) => {
            if (node.attrs['data-upload-id'] === uploadId) {
              foundPos = pos;
              return false;
            }
            return true;
          });
          
          if (foundPos >= 0) {
            const transaction = editor.state.tr;
            transaction.delete(foundPos, foundPos + 1);
            editor.view.dispatch(transaction);
          }
          
          if (onFileUpload) {
            onFileUpload('', file.name, file.type, uploadId, true);
          }
        }
      });
    },
    onDrop: (editor, files, pos) => {
      files.forEach(async (file) => {
        const uploadId = randomId();
        try {
          // Show temporary placeholder at drop position
          const tempNode = editor.schema.nodes.image.create({
            src: '',
            'data-uploading': 'true',
            'data-upload-id': uploadId,
            alt: file.name,
            title: file.name,
          });
          
          const transaction = editor.state.tr;
          transaction.insert(pos, tempNode);
          editor.view.dispatch(transaction);
          
          // Start upload
          const src = await (uploader ?? fakeuploader)(file);
          
          // Find and replace the temporary node
          const doc = editor.state.doc;
          let foundPos = -1;
          
          doc.descendants((node, nodePos) => {
            if (node.attrs['data-upload-id'] === uploadId) {
              foundPos = nodePos;
              return false;
            }
            return true;
          });
          
          if (foundPos >= 0) {
            const transaction = editor.state.tr;
            transaction.setNodeMarkup(foundPos, undefined, {
              ...doc.nodeAt(foundPos)?.attrs,
              src,
              'data-uploading': undefined,
            });
            editor.view.dispatch(transaction);
          }
          
          if (onFileUpload) {
            onFileUpload(src, file.name, file.type, uploadId, false);
          }
        } catch {
          console.error('Error uploading file');
          
          // Remove the temporary node if upload fails
          const doc = editor.state.doc;
          let foundPos = -1;
          
          doc.descendants((node, nodePos) => {
            if (node.attrs['data-upload-id'] === uploadId) {
              foundPos = nodePos;
              return false;
            }
            return true;
          });
          
          if (foundPos >= 0) {
            const transaction = editor.state.tr;
            transaction.delete(foundPos, foundPos + 1);
            editor.view.dispatch(transaction);
          }
          
          if (onFileUpload) {
            onFileUpload('', file.name, file.type, uploadId, true);
          }
        }
      });
    },
    onValidationError: (errors) => {
      errors.forEach((error) => {
        toast.error("File upload error", {
          position: "bottom-right",
          description: error.reason || 'Invalid file type or size',
        });
      });
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
  Placeholder.configure({
    placeholder: ({ editor }) => {
      // Only show placeholder when editor is completely empty
      if (editor.state.doc.content.childCount === 1 && 
          editor.state.doc.firstChild?.content.size === 0) {
        return placeholder;
      }
      return '';
    },
    showOnlyWhenEditable: true,
    emptyEditorClass: 'is-editor-empty',
    emptyNodeClass: 'is-empty',
  }),
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
        // Get the current editor state
        const content = editor.getJSON();
        
        if (content) {
          // Ensure we're not double-wrapping the content
          if (output === 'json') {
            throttledSetValue(content);
          } else {
            const outputContent = getOutput(editor, output) as TiptapContent;
            throttledSetValue(outputContent);
          }
        }
      } catch {
        // Handle any errors silently
      }
    },
    [output, throttledSetValue]
  )

  const handleCreate = React.useCallback(
    (editor: Editor) => {
      if (!value) {
        return;
      }
      
      try {
        // If value is a string, try to parse it as JSON
        const content = typeof value === 'string' 
          ? JSON.parse(value)
          : value;
        
        // Only set content if the editor is empty to prevent overwriting existing content
        if (editor.isEmpty) {
          editor.commands.setContent(content);
        }
      } catch {
        // Log error only in development
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error setting editor content');
        }
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
      } catch {
        // Handle errors silently in production
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error in editor blur');
        }
      }
    },
    [output, onBlur]
  )

  const editor = useEditor({
    // Prevent hydration mismatch by not rendering on the server
    immediatelyRender: false,
    extensions: createExtensions({
      placeholder,
      uploader,
      onFileUpload: (url, fileName, fileType, uploadId, isError) => {
        onFileUpload?.(url, fileName, fileType, uploadId, isError);
      },
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
