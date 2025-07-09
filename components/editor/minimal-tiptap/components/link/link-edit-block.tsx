import * as React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export interface LinkEditorProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultUrl?: string
  defaultText?: string
  defaultIsNewTab?: boolean
  onSave: (url: string, text?: string, isNewTab?: boolean) => void
}

export const LinkEditBlock = React.forwardRef<HTMLDivElement, LinkEditorProps>(
  ({ onSave, defaultIsNewTab, defaultUrl, defaultText, className }, ref) => {
    const formRef = React.useRef<HTMLDivElement>(null)
    const [url, setUrl] = React.useState(defaultUrl || "")
    const [text, setText] = React.useState(defaultText || "")
    const [isNewTab, setIsNewTab] = React.useState(defaultIsNewTab || false)

    const handleSave = React.useCallback(
      (e: React.FormEvent) => {
        e.preventDefault()
        if (formRef.current) {
          const isValid = Array.from(
            formRef.current.querySelectorAll("input")
          ).every((input) => input.checkValidity())

          if (isValid) {
            onSave(url, text, isNewTab)
          } else {
            formRef.current.querySelectorAll("input").forEach((input) => {
              if (!input.checkValidity()) {
                input.reportValidity()
              }
            })
          }
        }
      },
      [onSave, url, text, isNewTab]
    )

    React.useImperativeHandle(ref, () => formRef.current as HTMLDivElement)

    return (
      <div ref={formRef}>
        <Tabs defaultValue="web" className={cn("space-y-4", className)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="web">Web URL</TabsTrigger>
            <TabsTrigger value="internal">Internal Link</TabsTrigger>
          </TabsList>

          <TabsContent value="web" className="space-y-4">
            <div className="space-y-1">
              <Label>Web Address</Label>
              <Input
                type="url"
                required
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>

          <TabsContent value="internal" className="space-y-4">
            <div className="space-y-1">
              <Label>Note Title</Label>
              <Input
                type="text"
                placeholder="Search for a note..."
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  // This would be replaced with actual note search functionality
                  // For now, we'll just use the text as part of the URL
                  setUrl(`/notes/${encodeURIComponent(e.target.value.toLowerCase().replace(/\s+/g, '-'))}`);
                }}
                className="text-sm"
              />
              {text && (
                <p className="text-xs text-muted-foreground mt-1">
                  Will create link to: <span className="font-mono">/notes/{encodeURIComponent(text.toLowerCase().replace(/\s+/g, '-'))}</span>
                </p>
              )}
            </div>
          </TabsContent>

          <div className="space-y-1">
            <Label>Display Text (optional)</Label>
            <Input
              type="text"
              placeholder="Enter display text"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="new-tab" checked={isNewTab} onCheckedChange={setIsNewTab} />
            <Label htmlFor="new-tab">Open in New Tab</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" onClick={handleSave}>
              Save Link
            </Button>
          </div>
        </Tabs>
      </div>
    )
  }
)

LinkEditBlock.displayName = "LinkEditBlock"

export default LinkEditBlock
