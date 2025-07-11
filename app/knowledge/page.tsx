'use client';

import { useState } from 'react';
import { Search, Plus, Network, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { mockKnowledgeData } from './mockData';

// Dynamically import the KnowledgeGraph component with no SSR
const KnowledgeGraph = dynamic(
  () => import('@/components/knowledge/KnowledgeGraph'),
  { ssr: false }
);

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'graph'>('graph');
  
  // Simple search filter
  const filteredNotes = mockKnowledgeData.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full p-4 relative flex flex-col" style={{ height: 'calc(100vh - 2rem)' }}>
      <div className="flex flex-col flex-1 space-y-4">
        {/* Search and View Toggle */}
        <div className="flex items-center justify-between w-full gap-2">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
                notes={filteredNotes} 
                height="100%"
                className="h-full w-full"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="list" className="mt-0">
            {filteredNotes.length > 0 ? (
              <div className="space-y-4">
                {filteredNotes.map((note) => (
                  <div key={note.id} className="rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                    <h3 className="font-medium">{note.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {note.linkTo && note.linkTo.length > 0 && (
                        <div className="flex items-center">
                          <span className="text-xs text-muted-foreground mr-2">Links to:</span>
                          {note.linkTo.map((linkId: string) => {
                            const linkedNote = mockKnowledgeData.find(n => n.id === linkId);
                            return linkedNote ? (
                              <span key={linkId} className="text-xs bg-muted rounded-full px-2 py-0.5">
                                {linkedNote.title}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                      {note.referencedBy && note.referencedBy.length > 0 && (
                        <div className="flex items-center">
                          <span className="text-xs text-muted-foreground mr-2">Referenced by:</span>
                          {note.referencedBy.map((refId: string) => {
                            const refNote = mockKnowledgeData.find(n => n.id === refId);
                            return refNote ? (
                              <span key={refId} className="text-xs bg-muted/50 rounded-full px-2 py-0.5">
                                {refNote.title}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 rounded-lg border border-dashed p-8 text-center">
                <h3 className="text-lg font-medium">No knowledge items found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or add a new knowledge item.
                </p>
              </div>
            )}
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
