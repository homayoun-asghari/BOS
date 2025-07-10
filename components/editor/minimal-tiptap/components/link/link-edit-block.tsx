import * as React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NoteSearch } from "./note-search"

export interface LinkEditorProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultUrl?: string
  defaultText?: string
  isLoading?: boolean
  onSave: (url: string, text?: string) => void
}

export const LinkEditBlock = React.forwardRef<HTMLDivElement, LinkEditorProps>(
  ({ onSave, defaultUrl, defaultText, className, isLoading = false }, ref) => {
    const formRef = React.useRef<HTMLDivElement>(null)
    const [url, setUrl] = React.useState(defaultUrl || "")
    const [text, setText] = React.useState(defaultText || "")
    const [activeTab, setActiveTab] = React.useState("web")

    React.useEffect(() => {
      if (defaultUrl?.startsWith("/notes/")) {
        setActiveTab("internal")
      }
    }, [defaultUrl])

    React.useImperativeHandle(ref, () => formRef.current as HTMLDivElement)

    const ensureUrlHasProtocol = (url: string): string => {
      if (!url) return url;
      // If it's already a valid URL with protocol, return as is
      if (/^https?:\/\//.test(url)) return url;
      // If it starts with www., add https://
      if (/^www\./i.test(url)) return `https://${url}`;
      // For relative URLs or other cases, add https://
      return `https://${url}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      
      // For internal links, ensure we're using the note ID in the URL
      let finalUrl = url;
      if (activeTab === "internal") {
        // If we have a URL with an ID, use it directly
        if (url?.match(/^\/notes\/[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
          finalUrl = url;
        } 
        // If we have text but no valid URL, generate a slug-based URL
        else if (text && !url) {
          finalUrl = `/notes/${encodeURIComponent(text.toLowerCase().replace(/\s+/g, '-'))}`;
        }
      } else if (activeTab === "web" && url) {
        // Ensure web URLs have a protocol
        finalUrl = ensureUrlHasProtocol(url);
      }
        
      onSave(finalUrl, text || finalUrl)
    }

    return (
      <div ref={formRef} className={className}>
        <form onSubmit={handleSubmit}>
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="web">Web URL</TabsTrigger>
              <TabsTrigger value="internal">Internal Link</TabsTrigger>
            </TabsList>

            <TabsContent value="web" className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="url">Web Address</Label>
                <Input
                  id="url"
                  type="text"
                  required={activeTab === "web"}
                  placeholder="example.com"
                  value={activeTab === "web" ? url : ""}
                  onChange={(e) => setUrl(e.target.value)}
                  className="font-mono text-sm"
                  autoFocus
                />
              </div>
            </TabsContent>

            <TabsContent value="internal" className="space-y-4">
              <div className="space-y-1">
                <Label>Search Note</Label>
                <NoteSearch
                  value={text}
                  onChange={(newText) => {
                    setText(newText)
                    // Don't update URL on text change to avoid overwriting the ID
                    if (!url || !url.startsWith('/notes/')) {
                      setUrl(`/notes/${encodeURIComponent(newText.toLowerCase().replace(/\s+/g, '-'))}`)
                    }
                  }}
                  onSelect={(note) => {
                    setText(note.title)
                    // Always use the note ID for the URL to ensure proper linking
                    setUrl(`/notes/${note.id}`)
                  }}
                />
                {activeTab === "internal" && text && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Will create link to: <span className="font-mono">/notes/{text.includes(' ') ? encodeURIComponent(text.toLowerCase().replace(/\s+/g, '-')) : text}</span>
                  </p>
                )}
              </div>
            </TabsContent>

            <div className="space-y-1">
              <Label htmlFor="display-text">Display Text (optional)</Label>
              <Input
                id="display-text"
                type="text"
                placeholder="Enter display text"
                value={activeTab === "internal" && !text ? "" : text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Link'}
              </Button>
            </div>
          </Tabs>
        </form>
      </div>
    )
  }
)

LinkEditBlock.displayName = "LinkEditBlock"

export default LinkEditBlock
