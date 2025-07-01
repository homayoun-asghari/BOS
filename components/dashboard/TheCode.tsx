"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Textarea } from "../../components/ui/textarea";

const TheCode: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const value = inputValue.trim();
    if (!value) return;
    
    console.log('Submitted value:', value);
    setInputValue('');
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const resizeTextarea = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    };

    resizeTextarea();
  }, [inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleButtonClick(e as unknown as React.MouseEvent);
    }
  };

  return (
    <div className="relative flex-1 max-w-[calc(100%-48px)]" ref={dropdownRef}>
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-2.5 border border-border rounded-lg text-left hover:border-ring/50 transition-colors bg-background h-10"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          type="button"
        >
          <span className="text-muted-foreground text-sm truncate pr-2">
            {inputValue ? inputValue.substring(0, 50) + (inputValue.length > 50 ? '...' : '') : 'Who Do You Want To Become?'}
          </span>
          <ChevronDown 
            className={`h-4 w-4 text-muted-foreground/80 transition-transform ${isOpen ? 'rotate-180' : ''} flex-shrink-0`} 
            aria-hidden="true"
          />
        </button>
        
        {isOpen && (
          <div 
            className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden p-0.5 px-1.5"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value)}
                placeholder="Add Your Own Personal Code ..."
                className="min-h-[40px] h-10 pr-10 resize-none w-full px-3 py-2 mt-1"
                onKeyDown={handleKeyDown}
                aria-label="Add Your Own Personal Code"
                variant="ghost"
                rows={1}
              />
              <button
                type="button"
                onClick={handleButtonClick}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0 rounded-full hover:bg-muted/50 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                disabled={!inputValue.trim()}
                aria-label="Add code"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { TheCode };
