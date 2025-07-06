'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import useNotes from '@/hooks/useNotes';

interface NoteItem {
  id: string;
  title: string;
  content?: string;
}

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertLink: (url: string, text: string, isInternal: boolean) => void;
  selectedText?: string;
  isLoading?: boolean;
  currentNoteId?: string; // ID of the current note for creating the link relationship
}

export function LinkDialog({ 
  open, 
  onOpenChange, 
  onInsertLink, 
  selectedText = '',
  isLoading: externalLoading = false
}: LinkDialogProps) {
  const [url, setUrl] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('external');
  const [selectedNote, setSelectedNote] = React.useState<NoteItem | null>(null);
  const [textInput, setTextInput] = React.useState(selectedText);
  const [searchResults, setSearchResults] = React.useState<NoteItem[]>([]);
  const { searchNotes, isLoading: isSearching } = useNotes();
  
  // Combine loading states
  const isLoading = externalLoading || isSearching;

  const handleNoteSelect = (note: NoteItem) => {
    setSelectedNote(note);
    setSearchQuery(''); // Clear the search query
    setTextInput(note.title); // Always use the note's title as the link text
  };

  // Search for notes when search query changes
  React.useEffect(() => {
    const search = async () => {
      if (activeTab !== 'internal') return;
      
      const results = await searchNotes(searchQuery);
      setSearchResults(results);
      
      // Clear selected note if it's no longer in results
      if (selectedNote && !results.some(note => note.id === selectedNote.id)) {
        setSelectedNote(null);
      }
    };
    
    // Add a small debounce to avoid too many requests
    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeTab, selectedNote, searchNotes]);

  React.useEffect(() => {
    if (!open) {
      setUrl('');
      setSearchQuery('');
      setSelectedNote(null);
      setTextInput(selectedText);
    } else {
      // Set default URL to selected text if it looks like a URL
      if (selectedText && /^https?:\/\//.test(selectedText)) {
        setUrl(selectedText);
        setActiveTab('external');
      } else if (selectedText) {
        setSearchQuery(selectedText);
        setActiveTab('internal');
      }
    }
  }, [open, selectedText]);

  const handleInsert = async () => {
    console.log('handleInsert called with activeTab:', activeTab);
    
    if (activeTab === 'internal') {
      console.log('Processing internal link with selectedNote:', selectedNote);
      if (!selectedNote) {
        console.error('No note selected');
        return;
      }
      
      // For internal links, we'll use the note's ID as the URL and title as the text
      console.log('Calling onInsertLink with:', {
        url: selectedNote.id,
        text: selectedNote.title,
        isInternal: true
      });
      onInsertLink(selectedNote.id, selectedNote.title, true);
    } else {
      console.log('Processing external link with URL:', url);
      if (!url.trim()) {
        console.error('No URL provided for external link');
        return;
      }
      
      // Ensure URL has protocol for external links
      let finalUrl = url.trim();
      if (!/^https?:\/\//.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      
      console.log('Calling onInsertLink with:', {
        url: finalUrl,
        text: textInput || finalUrl,
        isInternal: false
      });
      onInsertLink(finalUrl, textInput || finalUrl, false);
    }
    
    // Reset form
    console.log('Resetting form state');
    setSelectedNote(null);
    setSearchQuery('');
    setUrl('');
    setTextInput('');
    onOpenChange(false);
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSelectedNote(null);
    setSearchQuery('');
    setTextInput(selectedText);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Insert Link</DialogTitle>
        </DialogHeader>
        
        <Tabs 
          value={activeTab}
          className="w-full"
          onValueChange={handleTabChange}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="internal">Internal Note</TabsTrigger>
            <TabsTrigger value="external">External URL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="internal" className="mt-4 space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search notes by title..."
                  className="w-full pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                
                {/* Dropdown with search results */}
                {searchQuery && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border overflow-hidden">
                    {isLoading ? (
                      <div className="p-2 text-center text-muted-foreground text-sm">
                        Searching...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto">
                        {searchResults.map((note) => (
                          <button
                            key={note.id}
                            type="button"
                            className={cn(
                              'w-full text-left p-2 hover:bg-accent',
                              selectedNote?.id === note.id && 'bg-accent',
                              'text-sm'
                            )}
                            onClick={() => handleNoteSelect(note)}
                          >
                            <div className="font-medium truncate">{note.title}</div>
                            {note.content && (
                              <div className="text-xs text-muted-foreground truncate">
                                {note.content.substring(0, 80)}
                                {note.content.length > 80 ? '...' : ''}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2 text-center text-muted-foreground text-sm">
                        No notes found
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedNote && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="text-sm font-medium mb-1">Linking to:</div>
                  <div className="text-sm">{selectedNote.title}</div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="external" className="mt-4">
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInsert();
                }}
              />
              {selectedText && (
                <div className="text-sm text-muted-foreground">
                  Link text: &quot;{selectedText}&quot;
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleInsert();
            }}
            disabled={activeTab === 'internal' ? !selectedNote : !url}
          >
            Insert Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
