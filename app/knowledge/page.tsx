'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Network, List, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import NoteList from '@/components/notes/NoteList';

// Dynamically import the KnowledgeGraph component with no SSR
const KnowledgeGraph = dynamic(
  () => import('@/components/knowledge/KnowledgeGraph'),
  { ssr: false }
);

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'graph'>('graph');
  const [tags, setTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const router = useRouter();
  const searchParamsObj = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize tags from URL
  useEffect(() => {
    const tagParams = Array.from(searchParamsObj.entries())
      .filter(([key]) => key.startsWith('tag'))
      .map(([, value]) => value);
    
    if (tagParams.length > 0) {
      setTags(tagParams);
    }
  }, [searchParamsObj]);

  // Initialize view from URL
  useEffect(() => {
    const viewParam = searchParamsObj.get('view') as 'list' | 'graph' | null;
    if (viewParam) {
      setView(viewParam);
    }
  }, [searchParamsObj]);

  // Update URL when view changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('view', view);
    router.push(`?${params.toString()}`);
  }, [view, router]);

  const normalizeTag = (tag: string): string => {
    // Remove leading # if exists and trim whitespace
    return tag.replace(/^#+/, '').trim();
  };

  const handleAddTag = (tag: string) => {
    const normalizedTag = normalizeTag(tag);
    const newTags = [...tags, normalizedTag];
    setTags(newTags);
    
    // Update URL with all tags
    const params = new URLSearchParams(window.location.search);
    params.set('search', searchQuery);
    
    // Clear existing tag parameters
    params.forEach((_, key) => {
      if (key.startsWith('tag')) {
        params.delete(key);
      }
    });
    
    // Add new tags
    newTags.forEach((tag, index) => {
      params.set(`tag${index + 1}`, tag);
    });
    
    router.push(`?${params.toString()}`);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    router.push(`?search=${encodeURIComponent(searchQuery)}${newTags.length > 0 ? `&tag=${encodeURIComponent(newTags[0])}` : ''}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      // If input starts with #, add as tag
      if (inputValue.startsWith('#')) {
        handleAddTag(inputValue);
      } else {
        // Otherwise, update search query
        setSearchQuery(inputValue);
        const params = new URLSearchParams(window.location.search);
        params.set('search', inputValue);
        router.push(`?${params.toString()}`);
      }
      setInputValue('');
    } else if (e.key === ' ' && inputValue.trim() && inputValue.startsWith('#')) {
      e.preventDefault();
      handleAddTag(inputValue);
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue) {
      e.preventDefault();
      const newTags = [...tags];
      newTags.pop();
      setTags(newTags);
      router.push(`?search=${encodeURIComponent(searchQuery)}${newTags.length > 0 ? `&tag=${encodeURIComponent(newTags[0])}` : ''}`);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Extract tags from query
    const tagMatches = query.match(/#(\w[\w\s]*)/g);
    if (tagMatches) {
      const newTags = tagMatches.map(tag => normalizeTag(tag));
      setTags(newTags);
    }
  };

  // Search filter for NoteList
  const searchFilter = {
    search: searchQuery,
    tags: tags.map(tag => tag.toLowerCase())
  };

  return (
    <div className="w-full p-4 relative flex flex-col" style={{ height: 'calc(100vh - 2rem)' }}>
      <div className="flex flex-col flex-1 space-y-4">
        {/* Search and View Toggle */}
        <div className="flex items-center justify-between w-full gap-2">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <div className="relative flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              {tags.map(tag => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <span>#{tag}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              <Input
                ref={inputRef}
                placeholder="Filter by tags and search notes..."
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  // Update search query immediately if not typing a tag
                  if (!e.target.value.startsWith('#')) {
                    setSearchQuery(e.target.value);
                    const params = new URLSearchParams(window.location.search);
                    params.set('search', e.target.value);
                    router.push(`?${params.toString()}`);
                  }
                }}
                onKeyDown={handleKeyDown}
                className="flex-1 border-0 bg-transparent px-0 py-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>
          
          <Tabs 
            value={view} 
            onValueChange={(v) => setView(v as 'list' | 'graph')} 
            className="flex-shrink-0 ml-auto"
          >
            <TabsList className="h-9">
              <TabsTrigger value="graph" className="h-7 px-2">
                <Network className="h-3.5 w-3.5" />
              </TabsTrigger>
              <TabsTrigger value="list" className="h-7 px-2">
                <List className="h-3.5 w-3.5" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'graph')} className="w-full flex-1 flex flex-col">
          <TabsContent value="graph" className="mt-0 p-0 flex-1">
            <div className="bg-background h-full">
              <KnowledgeGraph 
                search={searchQuery}
                tags={tags}
                height="100%"
                className="h-full w-full"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="list" className="mt-0">
            <div className="space-y-4">
              <NoteList searchParams={searchFilter} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-10">
        <Button 
          asChild 
          size="icon" 
          className="rounded-full h-12 w-12 shadow-lg"
        >
          <Link href="/notes/new">
            <Plus className="h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
