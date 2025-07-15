'use client';

import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tagService } from '@/lib/supabase/services/tagService';
import { toast } from 'sonner';
import { useTagSuggestions } from '@/hooks/useTagSuggestions';
import { TagSuggestions } from './TagSuggestions';
import { useOnClickOutside } from 'usehooks-ts';
import { useAuth } from '@/components/auth/AuthProvider';

interface InlineTagInputProps extends React.HTMLAttributes<HTMLDivElement> {
  noteId?: string;  // Made optional
  type: string | null;
  status: string | null;
  tags: string[];
  onTypeChange: (type: string) => void;
  onStatusChange: (status: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onEnterPress?: () => void;
  className?: string;
}

const InlineTagInput = React.forwardRef<HTMLInputElement, InlineTagInputProps>(({
  noteId,
  type,
  status,
  tags,
  onTypeChange,
  onStatusChange,
  onAddTag,
  onRemoveTag,
  onEnterPress,
  className,
  ...props
}, forwardedRef) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [operationsInProgress, setOperationsInProgress] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { suggestions, isLoading } = useTagSuggestions(inputValue, user?.id);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const handleAddTagWithBackend = async (tag: string) => {
    if (!tag || !user?.id || !noteId) return;
    
    const normalizedTag = normalizeTag(tag);
    if (!normalizedTag) return;
    
    const operationKey = `add:${normalizedTag}`;
    if (operationsInProgress.has(operationKey)) return;
    
    // Mark operation as in progress
    setOperationsInProgress(prev => new Set(prev).add(operationKey));
    
    // Update UI immediately
    onAddTag(normalizedTag);
    
    try {
      await tagService.addTagsToNote(noteId, [normalizedTag], user.id);
    } catch (error) {
      console.error('Failed to add tag:', error);
      onRemoveTag(normalizedTag);
      toast.error('Failed to add tag');
    } finally {
      setOperationsInProgress(prev => {
        const next = new Set(prev);
        next.delete(operationKey);
        return next;
      });
    }
  };

  const handleRemoveTagWithBackend = async (tag: string) => {
    if (!tag || !user?.id || !noteId) return;
    
    const normalizedTag = normalizeTag(tag);
    if (!normalizedTag) return;
    
    const operationKey = `remove:${normalizedTag}`;
    if (operationsInProgress.has(operationKey)) return;
    
    // Mark operation as in progress
    setOperationsInProgress(prev => new Set(prev).add(operationKey));
    
    // Store the tag for potential rollback
    const tagForRollback = tags.find(t => normalizeTag(t) === normalizedTag);
    
    // Update UI immediately
    onRemoveTag(normalizedTag);
    
    try {
      await tagService.removeTagsFromNote(noteId, [normalizedTag], user.id);
    } catch (error) {
      console.error('Failed to remove tag:', error);
      if (tagForRollback) onAddTag(tagForRollback);
      toast.error('Failed to remove tag');
    } finally {
      setOperationsInProgress(prev => {
        const next = new Set(prev);
        next.delete(operationKey);
        return next;
      });
    }
  };

  const normalizeTag = (tag: string): string => {
    // Remove leading # if exists and trim whitespace
    return tag.replace(/^#+/, '').trim();
  };
  
  const formatTagForDisplay = (tag: string): string => {
    // Always ensure tag starts with # for display
    const normalized = normalizeTag(tag);
    return `#${normalized}`;
  };

  const handleSuggestionSelect = (suggestion: string) => {
    const normalizedTag = normalizeTag(suggestion);
    if (!tags.some(tag => normalizeTag(tag).toLowerCase() === normalizedTag.toLowerCase())) {
      handleAddTagWithBackend(normalizedTag);
    }
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Handle arrow navigation in suggestions
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          Math.min(prev + 1, suggestions.length - 1)
        );
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => Math.max(-1, prev - 1));
        return;
      }
      
      if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        handleSuggestionSelect(suggestions[selectedSuggestionIndex]);
        setSelectedSuggestionIndex(-1);
        return;
      }
    }
    
    if (e.key === 'Enter') {
      const value = inputValue.trim();
      
      if (value) {
        e.preventDefault();
        
        // If there's a selected suggestion, use it
        if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
          handleSuggestionSelect(suggestions[selectedSuggestionIndex]);
          return;
        }
        
        // Normalize the tag by removing leading #
        const normalizedValue = normalizeTag(value);
        
        // Check if it's a special tag (type or status)
        if (normalizedValue.toLowerCase() === 'type' && !type) {
          onTypeChange('note');
          setInputValue('');
          return;
        } 
        
        if (normalizedValue.toLowerCase() === 'status' && !status) {
          onStatusChange('draft');
          setInputValue('');
          return;
        }
        
        // Check if the normalized tag already exists (case-insensitive)
        const tagExists = tags.some(tag => 
          tag.toLowerCase() === normalizedValue.toLowerCase() || 
          normalizeTag(tag).toLowerCase() === normalizedValue.toLowerCase()
        );
        
        // Add regular tag if it doesn't exist
        if (!tagExists) {
          handleAddTagWithBackend(normalizedValue);
        }
        
        setInputValue('');
        setSelectedSuggestionIndex(-1);
      } else {
        // If input is empty and Enter is pressed, move focus to editor
        e.preventDefault();
        onEnterPress?.();
      }
    } else if (e.key === ' ' && inputValue.trim()) {
      // Only handle space if there's input text
      e.preventDefault();
      const value = inputValue.trim();
      
      // If there's a selected suggestion, use it
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        handleSuggestionSelect(suggestions[selectedSuggestionIndex]);
        return;
      }
      
      // Normalize the tag by removing leading #
      const normalizedValue = normalizeTag(value);
      
      // Check if the normalized tag already exists (case-insensitive)
      const tagExists = tags.some(tag => 
        tag.toLowerCase() === normalizedValue.toLowerCase() || 
        normalizeTag(tag).toLowerCase() === normalizedValue.toLowerCase()
      );
      
      // Add regular tag if it doesn't exist
      if (!tagExists) {
        handleAddTagWithBackend(normalizedValue);
      }
      
      setInputValue('');
      setSelectedSuggestionIndex(-1);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove the last tag on backspace when input is empty
      e.preventDefault();
      handleRemoveTagWithBackend(tags[tags.length - 1]);
    }
  };

  // Focus the input when component mounts or when ref changes
  useEffect(() => {
    if (inputRef.current) {
      if (forwardedRef) {
        if (typeof forwardedRef === 'function') {
          forwardedRef(inputRef.current);
        } else {
          forwardedRef.current = inputRef.current;
        }
      }
      inputRef.current.focus();
    }
  }, [forwardedRef]);

  // Show warning if noteId is not available
  useEffect(() => {
    if (!noteId) {
      console.warn('InlineTagInput: noteId is undefined. Tags will not be saved until note is created.');
    }
  }, [noteId]);

  // Handle clicks outside to close suggestions
  useOnClickOutside(containerRef as React.RefObject<HTMLElement>, () => {
    if (operationsInProgress.size > 0) return;
    setIsFocused(false);
  });

  // Reset selected suggestion when input changes
  useEffect(() => {
    setSelectedSuggestionIndex(-1);
  }, [inputValue]);

  // ... (rest of the code remains the same)

  return (
    <div className="relative w-full" ref={containerRef} {...props}>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {type && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Type: {type}
            <button 
              type="button"
              onClick={() => onTypeChange('')}
              className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-200 text-blue-500 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-300 dark:hover:bg-blue-700"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        
        {status && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Status: {status}
            <button 
              type="button"
              onClick={() => onStatusChange('')}
              className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-200 text-green-500 hover:bg-green-300 dark:bg-green-800 dark:text-green-300 dark:hover:bg-green-700"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            {formatTagForDisplay(tag)}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTagWithBackend(tag);
              }}
              className="rounded-full p-0.5 hover:bg-muted-foreground/10 transition-colors"
              disabled={operationsInProgress.size > 0}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        
        <div className="relative flex-1 min-w-[100px]">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            className={cn(
              "w-full bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/50",
              operationsInProgress.size > 0 && "opacity-50 cursor-not-allowed"
            )}
            placeholder={type || status || tags.length > 0 ? '' : "#Type #Status #Topic ..."}
            disabled={operationsInProgress.size > 0}
          />
          
          <div className="absolute top-full left-0 z-10 w-48">
            {isFocused && inputValue && (
              <TagSuggestions
                suggestions={suggestions}
                isLoading={isLoading}
                onSelect={handleSuggestionSelect}
                inputValue={inputValue}
                selectedIndex={selectedSuggestionIndex}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

InlineTagInput.displayName = 'InlineTagInput';

export { InlineTagInput };
