import { useState } from 'react';
import { ChevronDown, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusDropdownProps {
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
}

const STATUSES = [
  { id: 'status1', name: 'Draft' },
  { id: 'status2', name: 'In Progress' },
  { id: 'status3', name: 'Completed' }
];

export function StatusDropdown({ value, onChange, className }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedStatus = STATUSES.find(s => s.id === value);

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
        <CheckCircle className="h-3.5 w-3.5" />
        {selectedStatus?.name || 'Status'}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-popover shadow-lg ring-1 ring-border focus:outline-none">
          <div className="py-1">
            {STATUSES.map((status) => (
              <button
                key={status.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(status.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted",
                  value === status.id && "bg-muted"
                )}
              >
                {status.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
