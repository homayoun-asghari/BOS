import * as React from "react"
import { useParams } from 'next/navigation'
import type { Editor } from "@tiptap/react"
import type { VariantProps } from "class-variance-authority"
import type { toggleVariants } from "@/components/ui/toggle"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Link2Icon } from "@radix-ui/react-icons"
import { ToolbarButton } from "../toolbar-button"
import { LinkEditBlock } from "./link-edit-block"
import { useNoteLinks } from "@/hooks/useNoteLinks"
import { toast } from "sonner"
type LinkAttributes = {
  href: string;
  target?: string;
  'data-link-type'?: 'internal' | 'external';
  'data-note-id'?: string;
};

interface LinkEditPopoverProps extends VariantProps<typeof toggleVariants> {
  editor: Editor
  noteId?: string
}

const LinkEditPopover = ({ editor, size, variant, noteId: propNoteId }: LinkEditPopoverProps) => {
  const params = useParams()
  const urlNoteId = params.id as string
  const noteId = propNoteId || urlNoteId
  const [open, setOpen] = React.useState(false)
  const formRef = React.useRef<HTMLDivElement>(null)
  const { from, to } = editor.state.selection
  // Keep the text variable as it might be used elsewhere in the component
  const _text = editor.state.doc.textBetween(from, to, " ")
  const { createLink, isLoading } = useNoteLinks()

  const onSetLink = React.useCallback<(
    url: string,
    displayText?: string,
    openInNewTab?: boolean,
    targetNoteId?: string
  ) => Promise<void>>(async (url, displayText, openInNewTab = false, targetNoteId) => {
      if (!noteId) {
        toast.error("Error", {
          description: "Note ID is missing. Cannot create link.",
        });
        return;
      }

      try {
        const isInternalLink = url.startsWith('/notes/') || !!targetNoteId;
        const selectedText = editor.state.doc.textBetween(
          editor.state.selection.from,
          editor.state.selection.to,
          " "
        );
        const linkText = selectedText || displayText || (isInternalLink ? url.split('/').pop()?.replace(/-/g, ' ') : url);
        
        // First update the editor content
        if (!editor.state.selection.empty) {
          editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({
              href: isInternalLink ? `/notes/${targetNoteId || url.split('/').pop()}` : url,
              target: openInNewTab ? '_blank' : '',
              // Cast to any to allow custom attributes
              ...(isInternalLink ? {
                'data-link-type': 'internal',
                'data-note-id': targetNoteId || url.split('/').pop()
              } : {
                'data-link-type': 'external'
              })
            } as LinkAttributes)
            .run();
        } else {
          // Handle case where there's no text selected (insert new text with link)
          const linkTextToInsert = linkText || (isInternalLink ? 'Note Link' : url);
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'text',
              text: linkTextToInsert,
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: isInternalLink ? `/notes/${targetNoteId || url.split('/').pop()}` : url,
                    target: openInNewTab ? '_blank' : '',
                    // Type assertion for custom attributes
                    ...(isInternalLink ? {
                      'data-link-type': 'internal',
                      'data-note-id': targetNoteId || url.split('/').pop()
                    } : {
                      'data-link-type': 'external'
                    }) as Record<string, string>
                  }
                }
              ]
            })
            .run();
        }

        // Then handle database operations in the background
        if (isInternalLink) {
          const pathPart = targetNoteId || url.split('/').pop();
          if (!pathPart) {
            throw new Error('Invalid note URL or ID');
          }
          
          // Save to database in the background with the selected text as link_text
          createLink({
            noteId,
            linkType: 'internal',
            targetNoteId: pathPart,
            linkText: selectedText || linkText || '',
          }).catch(() => {
            toast.warning("Link Created", {
              description: "The link was created but there was an issue saving it to your notebook.",
            });
          });
        } else {
          // Save external link to database in the background with the selected text as link_text
          createLink({
            noteId,
            linkType: 'external',
            url,
            linkText: selectedText || linkText || '',
          }).catch(() => {
            toast.warning("Link Created", {
              description: "The link was created but there was an issue saving it to your notebook.",
            });
          });
        }

        toast.success("Link created", {
          description: isInternalLink ? "Internal link added successfully" : "External link added successfully",
        });
        
        setOpen(false);
      } catch {
        toast.error("Error", {
          description: "We couldn't create the link. Please try again.",
        });
        setOpen(false);
      }
    },
    [editor, noteId, createLink]
  )

  // Handle existing link click
  const handleLinkClick = React.useCallback(() => {
    if (editor.isActive('link')) {
      const attrs = editor.getAttributes('link')
      if (attrs.href) {
        if (attrs['data-link-type'] === 'internal') {
          // Handle internal link navigation
          window.location.href = attrs.href
        } else {
          // Open external link in new tab
          window.open(attrs.href, attrs.target || '_blank')
        }
      }
    }
  }, [editor])

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <ToolbarButton
          isActive={editor.isActive("link")}
          tooltip="Link"
          aria-label={editor.isActive("link") ? "Edit link" : "Insert link"}
          disabled={editor.isActive("codeBlock") || isLoading}
          size={size}
          variant={variant}
          onClick={(e) => {
            if (editor.isActive('link')) {
              e.preventDefault()
              handleLinkClick()
              return
            }
            e.preventDefault()
            e.stopPropagation()
            setOpen(!open)
          }}
        >
          <Link2Icon className="size-5" />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent 
        className="w-full min-w-80" 
        align="end" 
        side="bottom"
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement
          if (formRef.current?.contains(target)) {
            e.preventDefault()
          }
        }}
      >
        <LinkEditBlock 
          onSave={onSetLink} 
          defaultText={_text} 
          defaultUrl={editor.getAttributes('link').href || ''}
          ref={formRef}
          isLoading={isLoading}
        />
      </PopoverContent>
    </Popover>
  )
}

export { LinkEditPopover }
