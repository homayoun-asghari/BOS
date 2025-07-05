'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/browser';
import { Bold, Italic, List, ListOrdered, Quote, ChevronDown, Plus, Tag, Eye, Code, Link as LinkIcon, Image as ImageIcon, Table, Type } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';


interface ToolbarButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
}

const ToolbarButton = ({ icon, onClick, isActive, disabled, title }: ToolbarButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
      isActive && "bg-gray-200 dark:bg-gray-700",
      disabled && "opacity-40 cursor-not-allowed"
    )}
    title={title}
  >
    {icon}
  </button>
);

// Simple rich text editor component
const RichTextEditor = ({ 
  value, 
  onChange,
  isSubmitting = false 
}: { 
  value: string, 
  onChange: (value: string) => void,
  isSubmitting?: boolean
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');


  const insertAtCursor = (before: string, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);
    
    let newValue = beforeText + before + selected + after + afterText;
    let newCursorPos = start + before.length;
    
    // If no text was selected and we're wrapping with something (like **), add cursor in the middle
    if (start === end && after) {
      newValue = beforeText + before + after + afterText;
      newCursorPos = start + before.length;
    }
    
    onChange(newValue);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      if (textarea) {
        textarea.selectionStart = newCursorPos + selected.length;
        textarea.selectionEnd = newCursorPos + selected.length;
        textarea.focus();
      }
    }, 0);
  };

  const handleTextSelection = () => {
    // This handler can be used for future text selection features
    const textarea = textareaRef.current;
    if (!textarea) return;
  };

  const renderEditor = () => (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onSelect={handleTextSelection}
      className={cn(
        'min-h-[calc(100vh-200px)] border-0 p-4 text-base focus-visible:ring-0 focus-visible:ring-offset-0 resize-none',
        viewMode === 'split' && 'w-1/2 border-r border-gray-200 dark:border-gray-700'
      )}
      disabled={isSubmitting}
      placeholder="Start writing in Markdown..."
    />
  );

  const renderPreview = () => (
    <div className={cn(
      'min-h-[calc(100vh-200px)] p-4 overflow-auto prose dark:prose-invert max-w-none',
      viewMode === 'split' && 'w-1/2'
    )}>
      <MarkdownRenderer content={value || '*No content to preview*'} />
    </div>
  );

  return (
    <div className="relative">
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 z-10">
        <div className="flex items-center mr-2 border-r border-gray-200 dark:border-gray-700 pr-2">
          <ToolbarButton
            icon={<Type className="h-4 w-4" />}
            onClick={() => insertAtCursor('# ', '')}
            disabled={isSubmitting}
            title="Heading 1"
          />
          <ToolbarButton
            icon={<span className="text-sm">H1</span>}
            onClick={() => insertAtCursor('## ', '')}
            disabled={isSubmitting}
            title="Heading 2"
          />
          <ToolbarButton
            icon={<span className="text-xs">H2</span>}
            onClick={() => insertAtCursor('### ', '')}
            disabled={isSubmitting}
            title="Heading 3"
          />
        </div>
        
        <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2">
          <ToolbarButton
            icon={<Bold className="h-4 w-4" />}
            onClick={() => insertAtCursor('**', '**')}
            disabled={isSubmitting}
            title="Bold"
          />
          <ToolbarButton
            icon={<Italic className="h-4 w-4" />}
            onClick={() => insertAtCursor('*', '*')}
            disabled={isSubmitting}
            title="Italic"
          />
          <ToolbarButton
            icon={<LinkIcon className="h-4 w-4" />}
            onClick={() => insertAtCursor('[', '](url)')}
            disabled={isSubmitting}
            title="Link"
          />
          <ToolbarButton
            icon={<ImageIcon className="h-4 w-4" />}
            onClick={() => insertAtCursor('![alt text](', ')')}
            disabled={isSubmitting}
            title="Image"
          />
          <ToolbarButton
            icon={<Code className="h-4 w-4" />}
            onClick={() => insertAtCursor('`', '`')}
            disabled={isSubmitting}
            title="Inline Code"
          />
        </div>

        <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2">
          <ToolbarButton
            icon={<List className="h-4 w-4" />}
            onClick={() => insertAtCursor('\n- ', '')}
            disabled={isSubmitting}
            title="Bullet List"
          />
          <ToolbarButton
            icon={<ListOrdered className="h-4 w-4" />}
            onClick={() => insertAtCursor('\n1. ', '')}
            disabled={isSubmitting}
            title="Numbered List"
          />
          <ToolbarButton
            icon={<Table className="h-4 w-4" />}
            onClick={() => insertAtCursor('\n| Header | Description |\n|--------|-------------|\n| Cell   | Cell        |\n', '')}
            disabled={isSubmitting}
            title="Table"
          />
          <ToolbarButton
            icon={<Quote className="h-4 w-4" />}
            onClick={() => insertAtCursor('\n> ', '')}
            disabled={isSubmitting}
            title="Quote"
          />
        </div>

        <div className="flex items-center">
          <ToolbarButton
            icon={<Eye className="h-4 w-4" />}
            onClick={() => setViewMode('preview')}
            isActive={viewMode === 'preview'}
            disabled={isSubmitting}
            title="Preview"
          />
          <ToolbarButton
            icon={<span className="text-xs">A</span>}
            onClick={() => setViewMode('edit')}
            isActive={viewMode === 'edit'}
            disabled={isSubmitting}
            title="Edit"
          />
          <ToolbarButton
            icon={<span className="text-xs">A|B</span>}
            onClick={() => setViewMode('split')}
            isActive={viewMode === 'split'}
            disabled={isSubmitting}
            title="Split View"
          />
        </div>
      </div>

      <div className="flex">
        {(viewMode === 'edit' || viewMode === 'split') && renderEditor()}
        {(viewMode === 'preview' || viewMode === 'split') && renderPreview()}
      </div>
    </div>
  );
};

// Custom dropdown component
const Dropdown = ({ 
  label, 
  children, 
  isOpen, 
  onToggle,
  className = ''
}: { 
  label: string; 
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}) => (
  <div className={cn("relative inline-block text-left", className)}>
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <Tag className="h-3.5 w-3.5" />
      {label}
      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
    </button>
    
    {isOpen && (
      <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <div className="py-1">
          {children}
        </div>
      </div>
    )}
  </div>
);

// Dropdown item component
const DropdownItem = ({ 
  children, 
  onClick,
  isActive = false
}: { 
  children: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
      isActive && "bg-gray-100 dark:bg-gray-700"
    )}
  >
    {children}
  </button>
);

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function KnowledgeForm() {
  const [content, setContent] = useState('');
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  
  // Placeholder types and statuses
  const types = [
    { id: 'type1', name: 'Documentation' },
    { id: 'type2', name: 'Tutorial' },
    { id: 'type3', name: 'Reference' }
  ];
  
  const statuses = [
    { id: 'status1', name: 'Draft' },
    { id: 'status2', name: 'In Progress' },
    { id: 'status3', name: 'Completed' }
  ];
  
  const { user } = useUser();

  const supabase = createClient();
  
  // Use debounced content for auto-save
  const debouncedContent = useDebounce(content, 1000);
  
  // Save note to database (non-blocking)
  const saveNote = useCallback(async () => {
    if (!user) return;
    
    const saveData = async () => {
      try {
        const now = new Date();
        const noteData = {
          title: 'Untitled', // Default title since we removed the title input
          content: debouncedContent,
          user_id: user.id,
          updated_at: now.toISOString(),
          ...(createdAt ? {} : { created_at: now.toISOString() })
        };
        
        if (noteId) {
          // Update existing note
          const { error } = await supabase
            .from('notes')
            .update(noteData)
            .eq('id', noteId);
            
          if (error) throw error;
          setUpdatedAt(now);
          if (!createdAt) setCreatedAt(now);
        } else if (debouncedContent) {
          // Create new note only if there's content
          const { data, error } = await supabase
            .from('notes')
            .insert([noteData])
            .select()
            .single();
            
          if (error) throw error;
          setNoteId(data.id);
          setCreatedAt(now);
          setUpdatedAt(now);
        }
      } catch (error) {
        console.error('Error saving note:', error);
      }
    };
    
    // Don't wait for save to complete
    saveData();
  }, [user, debouncedContent, noteId, supabase, createdAt]);
  
  // Auto-save when content changes (debounced)
  useEffect(() => {
    if (debouncedContent) {
      saveNote();
    }
  }, [debouncedContent, saveNote]);
  
  // Handle content changes
  const handleContentChange = (value: string) => {
    setContent(value);
  };
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowTypeDropdown(false);
      setShowStatusDropdown(false);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dropdown 
            label={selectedType ? types.find(t => t.id === selectedType)?.name || 'Type' : 'Type'}
            isOpen={showTypeDropdown}
            onToggle={() => {
              setShowTypeDropdown(!showTypeDropdown);
              setShowStatusDropdown(false);
            }}
          >
            {types.map((type) => (
              <DropdownItem 
                key={type.id}
                isActive={selectedType === type.id}
                onClick={() => {
                  setSelectedType(type.id);
                  setShowTypeDropdown(false);
                }}
              >
                {type.name}
              </DropdownItem>
            ))}
          </Dropdown>
          
          <Dropdown 
            label={selectedStatus ? statuses.find(s => s.id === selectedStatus)?.name || 'Status' : 'Status'}
            isOpen={showStatusDropdown}
            onToggle={() => {
              setShowStatusDropdown(!showStatusDropdown);
              setShowTypeDropdown(false);
            }}
          >
            {statuses.map((status) => (
              <DropdownItem 
                key={status.id}
                isActive={selectedStatus === status.id}
                onClick={() => {
                  setSelectedStatus(status.id);
                  setShowStatusDropdown(false);
                }}
              >
                {status.name}
              </DropdownItem>
            ))}
          </Dropdown>
          
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowTagInput(true);
            }}
            className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Tag
          </button>
          
          {showTagInput && (
            <div className="relative">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTag.trim()) {
                    // Add tag logic here
                    setNewTag('');
                    setShowTagInput(false);
                  } else if (e.key === 'Escape') {
                    setShowTagInput(false);
                  }
                }}
                onBlur={() => setShowTagInput(false)}
                autoFocus
                className="text-sm border-0 border-b border-gray-300 dark:border-gray-600 bg-transparent focus:ring-0 focus:border-blue-500 p-1 w-32"
                placeholder="Tag name..."
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {(createdAt || updatedAt) && (
          <div className="px-6 pt-6 text-center">
            <div className="text-xs text-gray-400 dark:text-gray-500 space-x-2">
              {createdAt && (
                <span>Created: {formatDate(createdAt)}</span>
              )}
              {updatedAt && updatedAt.getTime() !== createdAt?.getTime() && (
                <span>• Updated: {formatDate(updatedAt)}</span>
              )}
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-auto px-6 pb-6">
          <RichTextEditor 
            value={content}
            onChange={handleContentChange}
          />
        </div>
      </div>
    </div>
  );
}
