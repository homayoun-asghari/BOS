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
  onInsertLink: (url: string, text: string, isInternal: boolean, targetNoteId?: string) => void;
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
  const [isSearching, setIsSearching] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const { searchNotes } = useNotes();
  
  // Only show loading state if we're actually searching or loading
  const isLoading = externalLoading || isSearching;
  
  // Debug logging
  React.useEffect(() => {
    console.log('Search state:', {
      isSearching,
      hasSearched,
      searchQuery,
      resultsCount: searchResults.length,
      activeTab,
      open
    });
  }, [isSearching, hasSearched, searchQuery, searchResults.length, activeTab, open]);

  const handleNoteSelect = (note: NoteItem) => {
    setSelectedNote(note);
    setSearchQuery(''); // Clear the search query
    setTextInput(note.title); // Always use the note's title as the link text
    
    // Insert the link and close the dialog
    // Pass just the note ID - the TipTapEditor will handle the URL formatting
    onInsertLink(note.id, note.title, true, note.id);
    onOpenChange(false);
  };

  // Handle search with debounce
  React.useEffect(() => {
    let isMounted = true;
    
    const performSearch = async () => {
      if (activeTab !== 'internal') return;
      
      const query = searchQuery.trim();
      
      // Don't search if the query is empty (handled by the recent notes effect)
      if (query === '') return;
      
      console.log('Performing search with query:', query);
      setIsSearching(true);
      setHasSearched(true);
      
      try {
        const results = await searchNotes(query);
        console.log('Search results:', results);
        
        if (isMounted) {
          setSearchResults(Array.isArray(results) ? results : []);
          
          // Clear selected note if it's no longer in results
          if (selectedNote && results && !results.some(note => note.id === selectedNote.id)) {
            setSelectedNote(null);
          }
        }
      } catch (error) {
        console.error('Error performing search:', error);
        if (isMounted) {
          setSearchResults([]);
        }
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    };
    
    const timer = setTimeout(performSearch, 300);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, activeTab, selectedNote, searchNotes]);
  
  // Load recent notes when the dialog is opened or when switching to the internal tab
  React.useEffect(() => {
    let isMounted = true;
    
    const loadRecentNotes = async () => {
      if (open && activeTab === 'internal' && searchQuery === '') {
        try {
          console.log('Loading recent notes...');
          setIsSearching(true);
          const recentNotes = await searchNotes('');
          console.log('Loaded recent notes:', recentNotes);
          
          if (isMounted) {
            setSearchResults(Array.isArray(recentNotes) ? recentNotes : []);
            setHasSearched(true);
          }
        } catch (error) {
          console.error('Error loading recent notes:', error);
          if (isMounted) {
            setSearchResults([]);
          }
        } finally {
          if (isMounted) {
            setIsSearching(false);
          }
        }
      } else if (isMounted) {
        // Clear results if we're not on the internal tab or search query is not empty
        setSearchResults([]);
      }
    };
    
    if (open) {
      loadRecentNotes();
    } else {
      // Reset states when dialog is closed
      if (isMounted) {
        setSearchResults([]);
        setHasSearched(false);
        setSearchQuery('');
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, [open, activeTab, searchQuery, searchNotes]);

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
      
      // For internal links, pass just the note ID - the TipTapEditor will handle the URL formatting
      console.log('Calling onInsertLink with:', {
        noteId: selectedNote.id,
        text: selectedNote.title,
        isInternal: true
      });
      onInsertLink(selectedNote.id, selectedNote.title, true, selectedNote.id);
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Clear selection if search query changes
    if (value !== selectedNote?.title) {
      setSelectedNote(null);
    }
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
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full"
                  autoFocus
                />
                
                {/* Dropdown with search results */}
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border overflow-hidden">
                  {/* Always show results if we have them */}
                  {searchResults.length > 0 ? (
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
                          <div className="font-medium truncate">{note.title || 'Untitled Note'}</div>
                          {note.content && (
                            <div className="text-xs text-muted-foreground truncate">
                              {note.content.substring(0, 80)}
                              {note.content.length > 80 ? '...' : ''}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  
                  {/* Show empty states only when not loading and no results */}
                  {!isLoading && searchResults.length === 0 && searchQuery ? (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      No notes found
                    </div>
                  ) : null}
                  
                  {!isLoading && searchResults.length === 0 && !searchQuery && hasSearched ? (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      No notes available
                    </div>
                  ) : null}
                  
                  {!isLoading && searchResults.length === 0 && !searchQuery && !hasSearched ? (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      Start typing to search notes
                    </div>
                  ) : null}
                </div>
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
