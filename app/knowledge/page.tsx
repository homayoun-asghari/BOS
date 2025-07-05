'use client';

import { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { Search, Filter, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { SettingsModal } from '@/components/settings/settings-modal';
import { HelpModal } from '@/components/help/help-modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type KnowledgeType = 'all' | 'article' | 'document' | 'video' | 'tutorial';
type KnowledgeStatus = 'all' | 'draft' | 'published' | 'archived';

export default function KnowledgePage() {
  const { user, loading: userLoading } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<KnowledgeType>('all');
  const [statusFilter, setStatusFilter] = useState<KnowledgeStatus>('all');
  const [isCodeAccordionOpen, setIsCodeAccordionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

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

  const handleCreateNew = () => {
    // Handle create new knowledge item
    console.log('Create new knowledge item');
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex relative">
      <div 
        className="fixed inset-0 z-0 opacity-10"
        style={{
          backgroundImage: "url('/asset/montain.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center -70%',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      />
      
      <div className="relative z-10 flex h-full w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar
            user={user}
            userLoading={userLoading}
            isCodeAccordionOpen={isCodeAccordionOpen}
            onCodeAccordionChange={setIsCodeAccordionOpen}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenHelp={() => setIsHelpOpen(true)}
          />

          <main className="flex-1 overflow-auto pb-24 md:pb-0">
            <div className="w-full p-6">
              <div className="flex flex-col space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold">Knowledge Base</h1>
                  <Button onClick={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Knowledge Item
                  </Button>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  {/* Search Bar - Takes most of the space */}
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search knowledge base..."
                      className="pl-10 w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {/* Filters - Full width on mobile, fixed width on larger screens */}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="w-1/2 sm:w-36">
                      <Select value={typeFilter} onValueChange={(value: KnowledgeType) => setTypeFilter(value)}>
                        <SelectTrigger className="w-full">
                          <div className="flex items-center gap-1.5 truncate">
                            <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <SelectValue placeholder="Type" className="truncate" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {knowledgeTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-1/2 sm:w-36">
                      <Select value={statusFilter} onValueChange={(value: KnowledgeStatus) => setStatusFilter(value)}>
                        <SelectTrigger className="w-full">
                          <div className="flex items-center gap-1.5 truncate">
                            <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <SelectValue placeholder="Status" className="truncate" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="bg-card rounded-lg border p-6">
                  <div className="text-center text-muted-foreground py-12">
                    <p>No knowledge items found. Create your first item to get started.</p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Modals */}
      <SettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        user={user}
      />
      <HelpModal open={isHelpOpen} onOpenChange={setIsHelpOpen} />
    </div>
  );
}
