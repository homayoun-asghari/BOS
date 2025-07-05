'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/browser';
import { ChevronDown, Plus, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TipTapEditor } from '../editor/TipTapEditor';

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
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
    >
      <Tag className="h-3.5 w-3.5" />
      {label}
      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
    </button>
    
    {isOpen && (
      <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-popover shadow-lg ring-1 ring-border focus:outline-none">
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
      "w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted",
      isActive && "bg-muted"
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
    if (!user) {
      console.error('No user found. Cannot save note.');
      throw new Error('No user found');
    }
    
    const saveData = async () => {
      try {
        const now = new Date();
        const noteData: Record<string, unknown> = {
          title: 'Untitled', // Default title since we removed the title input
          content: debouncedContent || '',
          user_id: user.id,
          updated_at: now.toISOString()
        };

        // Only add these fields if they have values
        if (selectedType) noteData.type = selectedType;
        if (selectedStatus) noteData.status = selectedStatus;
        if (!createdAt) noteData.created_at = now.toISOString();
        
        console.log('Saving note with data:', noteData);
        
        if (noteId) {
          // Update existing note
          const { data, error } = await supabase
            .from('notes')
            .update(noteData)
            .eq('id', noteId)
            .select()
            .single();
            
          if (error) {
            console.error('Error updating note:', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code
            });
            throw error;
          }
          
          console.log('Note updated successfully:', data);
          setUpdatedAt(now);
          if (!createdAt) setCreatedAt(now);
          return data;
        } else if (debouncedContent) {
          // Create new note only if there's content
          const { data, error } = await supabase
            .from('notes')
            .insert(noteData)
            .select()
            .single();
            
          if (error) {
            console.error('Error creating note:', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
              noteData
            });
            throw error;
          }
          
          console.log('Note created successfully:', data);
          setNoteId(data.id);
          setCreatedAt(now);
          setUpdatedAt(now);
          return data;
        }
      } catch (error) {
        console.error('Error in saveNote:', {
          error,
          errorString: String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error; // Re-throw to be caught by the outer catch
      }
    };
    
    // Don't wait for save to complete but ensure errors are caught
    return saveData().catch(error => {
      console.error('Unhandled error in saveData:', error);
      throw error; // Re-throw to be caught by the error boundary
    });
  }, [user, debouncedContent, noteId, supabase, createdAt, selectedType, selectedStatus]);
  
  // Auto-save when content changes (debounced)
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Memoize the save function to prevent unnecessary re-renders
  const handleSave = useCallback(async () => {
    if (!debouncedContent) return;
    
    try {
      setIsSaving(true);
      setSaveError(null);
      await saveNote();
    } catch (error) {
      console.error('Failed to save note:', error);
      setSaveError('Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [debouncedContent, saveNote]);
  
  // Clear error after 5 seconds when it changes
  useEffect(() => {
    if (!saveError) return;
    
    const timer = setTimeout(() => {
      setSaveError(null);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [saveError]);
  
  // Auto-save effect
  useEffect(() => {
    handleSave();
  }, [handleSave]);
  
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
    <div className="h-screen flex flex-col bg-background">
      {/* Status Bar */}
      <div className="border-b border-border px-4 py-1 text-xs text-muted-foreground bg-muted/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span>Saving...</span>
            </span>
          )}
          {saveError && (
            <span className="text-red-500 flex items-center gap-1">
              <span>⚠️ {saveError}</span>
            </span>
          )}
        </div>
        {updatedAt && (
          <span>Last saved: {formatDate(updatedAt)}</span>
        )}
      </div>
      
      {/* Toolbar */}
      <div className="border-b border-border px-4 py-2 flex items-center justify-between">
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
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
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
          <TipTapEditor 
            value={content}
            onChange={handleContentChange}
          />
        </div>
      </div>
    </div>
  );
}
