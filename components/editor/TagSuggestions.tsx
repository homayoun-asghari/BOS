import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagSuggestionsProps {
  suggestions: string[];
  isLoading: boolean;
  onSelect: (tag: string) => void;
  inputValue: string;
  selectedIndex: number;
  className?: string;
}

export const TagSuggestions: React.FC<TagSuggestionsProps> = ({
  suggestions,
  isLoading,
  onSelect,
  inputValue,
  selectedIndex,
  className = '',
}) => {
  if (suggestions.length === 0 && !isLoading && inputValue.trim()) {
    return (
      <div className={cn(
        "absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg overflow-hidden",
        className
      )}>
        <div className="p-2 text-sm text-muted-foreground">No matches</div>
      </div>
    );
  }

  if (suggestions.length === 0 || !inputValue.trim()) {
    return null;
  }

  return (
    <div className={cn(
      "absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg overflow-hidden",
      className
    )}>
      <ul className="py-1 text-sm max-h-60 overflow-auto">
        {suggestions.map((tag, index) => (
          <li key={tag}>
            <button
              type="button"
              className={cn(
                "w-full px-3 py-1.5 text-left hover:bg-accent hover:text-accent-foreground flex items-center text-sm",
                "truncate",
                selectedIndex === index ? "bg-accent text-accent-foreground" : ""
              )}
              onClick={(e) => {
                e.preventDefault();
                onSelect(tag);
              }}
              data-selected={selectedIndex === index ? "true" : undefined}
            >
              <span className="text-muted-foreground mr-1">#</span>
              <span className="truncate">{tag}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
