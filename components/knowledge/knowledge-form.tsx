'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Code, Quote, ChevronDown, Plus } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Simple rich text editor component
const RichTextEditor = ({ 
  value, 
  onChange,
  isSubmitting 
}: { 
  value: string, 
  onChange: (value: string) => void,
  isSubmitting: boolean
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.substring(0, start);
    const after = value.substring(end, value.length);
    
    onChange(before + text + after);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      if (textarea) {
        const newPos = start + text.length;
        textarea.selectionStart = newPos;
        textarea.selectionEnd = newPos;
        textarea.focus();
      }
    }, 0);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 p-1 border rounded-t-md bg-muted">
        <Toggle 
          size="sm" 
          onPressedChange={() => insertAtCursor('**bold**')}
          disabled={isSubmitting}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle 
          size="sm" 
          onPressedChange={() => insertAtCursor('*italic*')}
          disabled={isSubmitting}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle 
          size="sm" 
          onPressedChange={() => insertAtCursor('`code`')}
          disabled={isSubmitting}
          aria-label="Code"
        >
          <Code className="h-4 w-4" />
        </Toggle>
        <Toggle 
          size="sm" 
          onPressedChange={() => insertAtCursor('\n- ')}
          disabled={isSubmitting}
          aria-label="Bullet List"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle 
          size="sm" 
          onPressedChange={() => insertAtCursor('\n1. ')}
          disabled={isSubmitting}
          aria-label="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle 
          size="sm" 
          onPressedChange={() => insertAtCursor('\n> ')}
          disabled={isSubmitting}
          aria-label="Quote"
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        <Toggle 
          size="sm" 
          disabled={true}
          aria-label="Add Link"
          className="opacity-50"
        >
          <LinkIcon className="h-4 w-4" />
        </Toggle>
        <Toggle 
          size="sm" 
          disabled={true}
          aria-label="Add Image"
          className="opacity-50"
        >
          <ImageIcon className="h-4 w-4" />
        </Toggle>
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[200px] font-mono text-sm rounded-t-none"
        placeholder="Write your content here..."
        disabled={isSubmitting}
      />
    </div>
  );
};

export function KnowledgeForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  // Simplified state management
  const [newType, setNewType] = useState('');
  const [newStatus, setNewStatus] = useState('');
  
  // Placeholder types and statuses
  const types = [
    { id: 'type1', name: 'Type 1' },
    { id: 'type2', name: 'Type 2' },
    { id: 'type3', name: 'Type 3' }
  ];
  
  const statuses = [
    { id: 'status1', name: 'Status 1' },
    { id: 'status2', name: 'Status 2' },
    { id: 'status3', name: 'Status 3' }
  ];
  
  // Selection handlers (currently not used but kept for future implementation)
  
  // Placeholder functions for adding new items
  const addNewType = () => {
    if (newType.trim()) {
      // In a real app, you would add the new type to your database here
      setNewType('');
    }
  };
  
  const addNewStatus = () => {
    if (newStatus.trim()) {
      // In a real app, you would add the new status to your database here
      setNewStatus('');
    }
  };
  const { user } = useUser();
  const router = useRouter();
  const supabase = createClient();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    if (!user) {
      toast.error('You must be logged in to create a note');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('notes')
        .insert([
          { 
            title: title.trim(),
            content: content.trim(),
            user_id: user.id,
            // Add other fields as needed
          },
        ]);

      if (error) throw error;

      toast.success('Note created successfully');
      router.push('/knowledge');
      router.refresh();
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to create note');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title"
          disabled={isSubmitting}
          className="text-base"
        />
      </div>

      <div className="space-y-2">
        <Label>Content</Label>
        <RichTextEditor 
          value={content}
          onChange={setContent}
          isSubmitting={isSubmitting}
        />
      </div>

      <div className="space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">
          Metadata
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Type Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowTypeDropdown(!showTypeDropdown);
                setShowStatusDropdown(false);
              }}
              className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-10"
            >
              Type
              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
            {showTypeDropdown && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
                <div className="p-1">
                  {types.map((type) => (
                    <div
                      key={type.id}
                      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        // Type selection logic here
                        setShowTypeDropdown(false);
                      }}
                    >
                      {type.name}
                    </div>
                  ))}
                  <div className="flex items-center gap-1 p-1 border-t mt-1">
                    <Input
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      placeholder="New type..."
                      className="h-8 text-xs"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewType())}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={addNewType}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowTypeDropdown(false);
              }}
              className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-10"
            >
              Status
              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
            {showStatusDropdown && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
                <div className="p-1">
                  {statuses.map((status) => (
                    <div
                      key={status.id}
                      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        // Status selection logic here
                        setShowStatusDropdown(false);
                      }}
                    >
                      {status.name}
                    </div>
                  ))}
                  <div className="flex items-center gap-1 p-1 border-t mt-1">
                    <Input
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      placeholder="New status..."
                      className="h-8 text-xs"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewStatus())}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={addNewStatus}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/knowledge')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Note'}
        </Button>
      </div>
    </form>
  );
}
