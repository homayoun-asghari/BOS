'use client';

import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tagService } from '@/lib/supabase/services/tagService';
import { toast } from 'sonner';
import { useTagSuggestions } from '@/hooks/useTagSuggestions';
import { TagSuggestions } from './TagSuggestions';
import { useOnClickOutside } from 'usehooks-ts';

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
}, ref) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { suggestions, isLoading } = useTagSuggestions(inputValue);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const handleAddTagWithBackend = async (tag: string) => {
    if (!tag) return;
    
    // Update UI immediately
    onAddTag(tag);
    
    if (!noteId) {
      return;
    }
    
    if (isProcessing) {
      return;
    }
    
    setIsProcessing(true);
    
    // Process in background
    (async () => {
      try {
        await tagService.addTagsToNote(noteId, [tag]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to add tag';
        toast.error(errorMessage);
        // Revert the UI if the backend call fails
        onRemoveTag(tag);
      } finally {
        setIsProcessing(false);
      }
    })();
  };

  const handleRemoveTagWithBackend = async (tag: string) => {
    // Update UI immediately
    onRemoveTag(tag);
    
    if (!noteId) {
      return;
    }
    
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    // Process in background
    (async () => {
      try {
        await tagService.removeTagsFromNote(noteId, [tag]);
      } catch (error) {
        console.error('Background error removing tag:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to remove tag';
        toast.error(errorMessage);
        // Re-add the tag if the backend call fails
        onAddTag(tag);
      } finally {
        setIsProcessing(false);
      }
    })();
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
    if (inputRef.current && ref) {
      // @ts-ignore - We know the ref is compatible
      ref.current = inputRef.current;
      inputRef.current.focus();
    }
  }, [ref]);

  // Show warning if noteId is not available
  useEffect(() => {
    if (!noteId) {
      console.warn('InlineTagInput: noteId is undefined. Tags will not be saved until note is created.');
    }
  }, [noteId]);

  // Handle clicks outside to close suggestions
  useOnClickOutside(containerRef, () => {
    setIsFocused(false);
  });

  // Reset selected suggestion when input changes
  useEffect(() => {
    setSelectedSuggestionIndex(-1);
  }, [inputValue]);
  
  // Scroll selected suggestion into view
  useEffect(() => {
    if (selectedSuggestionIndex >= 0 && containerRef.current) {
      const selectedElement = containerRef.current.querySelector('[data-selected="true"]');
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedSuggestionIndex]);

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
              disabled={isProcessing}
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
              "w-full bg-transparent outline-none",
              isProcessing && "opacity-50 cursor-not-allowed"
            )}
            placeholder={type || status || tags.length > 0 ? '' : "#Type #Status #Topic ..."}
            disabled={isProcessing}
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
