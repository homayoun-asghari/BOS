import * as React from "react"
import { Check, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"

interface NoteSearchProps {
  value: string
  onChange: (value: string) => void
  onSelect: (value: { id: string; title: string }) => void
  className?: string
}

export function NoteSearch({ value: initialValue, onChange, onSelect, className }: NoteSearchProps) {
  const [inputValue, setInputValue] = React.useState(initialValue || '')
  const [open, setOpen] = React.useState(false)
  const [notes, setNotes] = React.useState<{ id: string; title: string }[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const supabase = createClient()
  
  // Sync with parent value if it changes
  React.useEffect(() => {
    setInputValue(initialValue || '')
  }, [initialValue])

  const searchNotes = async (query: string) => {
    if (!query) return []
    
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('id, title')
        .ilike('title', `%${query}%`)
        .limit(5)
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error searching notes:', error)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    onChange(query)
    if (query.length > 1) {
      const results = await searchNotes(query)
      setNotes(results)
    } else {
      setNotes([])
    }
  }

  // Keep track of the dropdown container ref
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Handle clicks outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && 
          inputRef.current !== event.target) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search notes..."
          className={cn("pl-8 w-full", className)}
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value
            setInputValue(newValue)
            if (newValue.length > 1) {
              setOpen(true)
              handleSearch(newValue)
            } else {
              setOpen(false)
              setNotes([])
            }
          }}
          onFocus={() => {
            if (inputValue.length > 1) {
              setOpen(true)
            }
          }}
          onClick={(e) => {
            e.stopPropagation()
            if (inputValue.length > 1) {
              setOpen(true)
            }
          }}
          autoFocus
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full">
          <div className="rounded-md border border-border shadow-lg bg-background overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              ) : notes.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No notes found.
                </div>
              ) : (
                <div className="py-1">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm flex items-center hover:bg-accent/50 cursor-pointer transition-colors",
                        inputValue === note.title ? "bg-accent/30" : "bg-background"
                      )}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setInputValue(note.title)
                        onSelect(note)
                        setOpen(false)
                        // Return focus to the input
                        inputRef.current?.focus()
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 flex-shrink-0",
                          inputValue === note.title ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{note.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
