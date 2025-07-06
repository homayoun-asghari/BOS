import { useState } from 'react';
import { ChevronDown, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TypeDropdownProps {
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
}

const TYPES = [
  { id: 'type1', name: 'Documentation' },
  { id: 'type2', name: 'Tutorial' },
  { id: 'type3', name: 'Reference' }
];

export function TypeDropdown({ value, onChange, className }: TypeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedType = TYPES.find(t => t.id === value);
  
  return (
    <div className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
      >
        <Tag className="h-3.5 w-3.5" />
        {selectedType?.name || 'Type'}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-popover shadow-lg ring-1 ring-border focus:outline-none">
          <div className="py-1">
            {TYPES.map((type) => (
              <button
                key={type.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(type.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted",
                  value === type.id && "bg-muted"
                )}
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
