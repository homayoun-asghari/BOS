'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Plus, Network, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import dynamic from 'next/dynamic';
import { mockKnowledgeData } from './mockData';

// Dynamically import the KnowledgeGraph component with no SSR
const KnowledgeGraph = dynamic(
  () => import('@/components/knowledge/KnowledgeGraph'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[500px] w-full bg-muted/50 rounded-lg">
        <div className="animate-pulse text-muted-foreground">Loading graph view...</div>
      </div>
    )
  }
);

type KnowledgeType = 'all' | 'article' | 'document' | 'video' | 'tutorial';
type KnowledgeStatus = 'all' | 'draft' | 'published' | 'archived';

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<KnowledgeType>('all');
  const [statusFilter, setStatusFilter] = useState<KnowledgeStatus>('all');

  const knowledgeTypes: { value: KnowledgeType; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'article', label: 'Articles' },
    { value: 'document', label: 'Documents' },
    { value: 'video', label: 'Videos' },
    { value: 'tutorial', label: 'Tutorials' },
  ];

  const statuses: { value: KnowledgeStatus; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
  ];

  const [view, setView] = useState<'list' | 'graph'>('graph');
  const [filteredNotes, setFilteredNotes] = useState(mockKnowledgeData);

  // Apply filters
  useEffect(() => {
    let result = [...mockKnowledgeData];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(note => 
        note.title.toLowerCase().includes(query) ||
        note.type?.toLowerCase().includes(query) ||
        note.status?.toLowerCase().includes(query)
      );
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter(note => note.type === typeFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(note => note.status === statusFilter);
    }
    
    setFilteredNotes(result);
  }, [searchQuery, typeFilter, statusFilter]);

  return (
    <div className="w-full p-6">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
          <div className="flex items-center space-x-2">
            <Button 
              variant={view === 'graph' ? 'outline' : 'ghost'} 
              size="sm" 
              onClick={() => setView('graph')}
              className="gap-2"
            >
              <Network className="h-4 w-4" />
              Graph View
            </Button>
            <Button 
              variant={view === 'list' ? 'outline' : 'ghost'} 
              size="sm" 
              onClick={() => setView('list')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              List View
            </Button>
            <Button asChild>
              <Link href="/notes/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Knowledge
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search knowledge..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex space-x-2">
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as KnowledgeType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {knowledgeTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as KnowledgeStatus)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="graph" value={view} onValueChange={(v) => setView(v as 'list' | 'graph')} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="graph" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Graph View
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="graph" className="mt-0">
            <div className="rounded-lg border bg-background p-4">
              <KnowledgeGraph 
                notes={filteredNotes} 
                height={600}
                className="min-h-[600px] w-full"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="list" className="mt-0">
            {filteredNotes.length > 0 ? (
              <div className="space-y-4">
                {filteredNotes.map((note) => (
                  <div key={note.id} className="rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                    <h3 className="font-medium">{note.title}</h3>
                    <div className="flex items-center mt-1 text-sm text-muted-foreground">
                      <span className="capitalize">{note.type}</span>
                      <span className="mx-2">•</span>
                      <span className="capitalize">{note.status}</span>
                    </div>
                    {note.links && note.links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground">Links:</span>
                        {note.links.map((linkId, index) => {
                          const linkedNote = mockKnowledgeData.find(n => n.id === linkId);
                          return linkedNote ? (
                            <span key={index} className="text-xs bg-muted rounded-full px-2 py-0.5">
                              {linkedNote.title}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 rounded-lg border border-dashed p-8 text-center">
                <h3 className="text-lg font-medium">No knowledge items found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or filters, or add a new knowledge item.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
