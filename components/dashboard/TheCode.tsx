"use client";

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

type Option = {
  id: number;
  title: string;
  description: string;
};

export function TheCode() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Generate sample options
  const options: Option[] = Array.from({ length: 30 }, (_, index) => ({
    id: index + 1,
    title: `Option ${index + 1}`,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.'
  }));

  const handleOptionSelect = (option: Option) => {
    console.log('Selected option:', option);
    setIsOpen(false);
  };

  return (
    <div className="relative flex-1 max-w-[calc(100%-48px)]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 border border-border rounded-lg text-left hover:border-ring/50 transition-colors bg-background"
      >
        <span className="text-muted-foreground text-sm">Who Do You Want To Become?</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground/80 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {options.map((option) => (
            <div 
              key={option.id}
              className="p-3 hover:bg-accent cursor-pointer text-foreground border-b border-border/50 last:border-0"
              onClick={() => handleOptionSelect(option)}
            >
              <p className="font-medium">{option.title}</p>
              <p className="text-sm text-muted-foreground">
                {option.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
