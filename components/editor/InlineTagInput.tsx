'use client';

import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineTagInputProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: string | null;
  status?: string | null;
  tags: string[];
  onTypeChange: (type: string) => void;
  onStatusChange: (status: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onEnterPress?: () => void;
  className?: string;
}

const InlineTagInput = React.forwardRef<HTMLInputElement, InlineTagInputProps>(({
  type,
  status,
  tags,
  onTypeChange,
  onStatusChange,
  onAddTag,
  onRemoveTag,
  className,
  ...props
}, ref) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = inputValue.trim();
      
      if (value) {
        e.preventDefault();
        // Check if it's a special tag (type or status)
        if (value.toLowerCase() === 'type' && !type) {
          onTypeChange('note'); // Default type
        } else if (value.toLowerCase() === 'status' && !status) {
          onStatusChange('draft'); // Default status
        } else if (value.toLowerCase() === 'topic' && !tags.includes('topic')) {
          onAddTag('topic');
        } else if (!tags.includes(value)) {
          onAddTag(value);
        }
        
        setInputValue('');
      }
      
      // Call the onEnterPress callback if provided
      if (props.onEnterPress) {
        props.onEnterPress();
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      const value = inputValue.trim();
      
      if (value) {
        // Check if it's a special tag (type or status)
        if (value.toLowerCase() === 'type' && !type) {
          onTypeChange('note'); // Default type
        } else if (value.toLowerCase() === 'status' && !status) {
          onStatusChange('draft'); // Default status
        } else if (value.toLowerCase() === 'topic' && !tags.includes('topic')) {
          onAddTag('topic');
        } else if (!tags.includes(value)) {
          onAddTag(value);
        }
        
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove the last tag on backspace when input is empty
      onRemoveTag(tags[tags.length - 1]);
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

  return (
    <div className={cn("flex flex-wrap items-center gap-2 px-4 py-2 text-sm text-muted-foreground", className)}>
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
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
        >
          {tag}
          <button 
            type="button"
            onClick={() => onRemoveTag(tag)}
            className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      
      <input
        ref={(node) => {
          inputRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent outline-none min-w-[100px] text-foreground"
        placeholder={type || status || tags.length > 0 ? '' : "#Type #Status #Topic ..."}
        {...props}
      />
    </div>
  );
});

InlineTagInput.displayName = 'InlineTagInput';

export { InlineTagInput };
