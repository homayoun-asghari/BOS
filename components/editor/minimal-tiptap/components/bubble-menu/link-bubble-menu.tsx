import * as React from "react"
import type { ShouldShowProps } from "../../types"
import type { Editor } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react"
import { LinkEditBlock } from "../link/link-edit-block"
import { LinkPopoverBlock } from "../link/link-popover-block"
import { useNoteLinks } from "@/hooks/useNoteLinks"

interface LinkBubbleMenuProps {
  editor: Editor
}

interface LinkAttributes {
  href: string
  target: string
  class?: string
  'data-note-id'?: string
}

export const LinkBubbleMenu: React.FC<LinkBubbleMenuProps> = ({ editor }) => {
  const [showEdit, setShowEdit] = React.useState(false)
  const [linkAttrs, setLinkAttrs] = React.useState<LinkAttributes>({
    href: "",
    target: "",
    class: "",
    'data-note-id': ""
  })
  const [selectedText, setSelectedText] = React.useState("")
  const [linkId, setLinkId] = React.useState<string | null>(null)
  const { deleteLink } = useNoteLinks()

  const updateLinkState = React.useCallback(() => {
    const attrs = editor.getAttributes("link")
    const { href, target, class: linkClass, 'data-link-id': dataLinkId, 'data-note-id': noteId } = attrs

    setLinkAttrs({
      href,
      target,
      class: linkClass,
      'data-note-id': noteId || ''
    })
    setLinkId(dataLinkId || null)
    
    // Always clear the selected text to prevent it from appearing in search
    setSelectedText('')
  }, [editor])

  const shouldShow = React.useCallback(
    ({ editor, from, to }: ShouldShowProps) => {
      if (from === to) {
        return false
      }
      const { href } = editor.getAttributes("link")

      if (!editor.isActive("link") || !editor.isEditable) {
        return false
      }

      if (href) {
        updateLinkState()
        return true
      }
      return false
    },
    [updateLinkState]
  )

  const handleEdit = React.useCallback(() => {
    setShowEdit(true)
  }, [])

  const onSetLink = React.useCallback(
    (url: string, text?: string, openInNewTab?: boolean) => {
      // Ensure internal links start with a forward slash
      const processedUrl = url.startsWith('/') ? url : url;
      const { from, to } = editor.state.selection;
      const currentText = editor.state.doc.textBetween(from, to, " ");
      
      // If there's selected text, update the link while preserving the text
      if (currentText) {
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({
            href: processedUrl,
            target: openInNewTab ? "_blank" : "",
            class: processedUrl.startsWith('/') ? 'internal-link' : 'external-link',
            rel: openInNewTab ? 'noopener noreferrer' : ''
          })
          .run();
      } else {
        // If no text is selected, insert the URL as the link text
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .insertContent({
            type: "text",
            text: text || processedUrl,
            marks: [
              {
                type: "link",
                attrs: {
                  href: processedUrl,
                  target: openInNewTab ? "_blank" : "",
                  class: processedUrl.startsWith('/') ? 'internal-link' : 'external-link',
                  rel: openInNewTab ? 'noopener noreferrer' : '',
                },
              },
            ],
          })
          .run();
      }
      
      setShowEdit(false);
      updateLinkState();
    },
    [editor, updateLinkState]
  )

  const onUnsetLink = React.useCallback(async () => {
    // First remove the link from the UI
    editor.chain().focus().extendMarkRange("link").unsetLink().run()
    
    // Then remove it from the database if we have a linkId
    if (linkId) {
      try {
        await deleteLink(linkId)
      } catch (err) {
        console.error('Failed to delete link from database:', err)
        // Even if DB deletion fails, we still want to update the UI
      }
    }
    
    setShowEdit(false)
    updateLinkState()
  }, [editor, updateLinkState, linkId, deleteLink])

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={shouldShow}
      tippyOptions={{
        placement: "bottom-start",
        onHidden: () => setShowEdit(false),
      }}
    >
      {showEdit ? (
        <LinkEditBlock
          defaultUrl={linkAttrs.href}
          defaultText={selectedText}
          onSave={onSetLink}
          className="w-full min-w-80 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none"
        />
      ) : (
        <LinkPopoverBlock
          onClear={onUnsetLink}
          url={linkAttrs['data-note-id'] ? `/notes/${linkAttrs['data-note-id']}` : linkAttrs.href}
          onEdit={handleEdit}
        />
      )}
    </BubbleMenu>
  )
}
