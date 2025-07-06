'use client';

import { useState } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
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

  return (
    <div className="w-full p-6">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
          <Button asChild>
            <Link href="/notes/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Knowledge
            </Link>
          </Button>
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

        <div className="flex-1 rounded-lg border border-dashed p-8 text-center">
          <h3 className="text-lg font-medium">No knowledge items found</h3>
          <p className="text-sm text-muted-foreground">
            Get started by adding a new knowledge item.
          </p>
        </div>
      </div>
    </div>
  );
}
