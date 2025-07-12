'use client';

import { cn } from '@/lib/utils';
import { useRightPanel } from './context/right-panel-context';
import type { RightPanelView } from './types/right-panel.types';
import { MessageSquare, AlertCircle } from 'lucide-react';

interface RightPanelProps {
  className?: string;
  children: React.ReactNode;
}

export function RightPanel({ className, children }: RightPanelProps) {
  // This panel is only shown on large screens (lg+)
  // On smaller screens, we use the /right-panel route
  return (
    <div 
      className={cn(
        'hidden lg:flex w-full max-w-[375px] flex-shrink-0 border-l border-border bg-background/95 backdrop-blur-sm',
        'h-screen fixed right-0 top-0 flex-col z-40',
        className
      )}
    >
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
      
      {/* Fixed bottom buttons */}
      <div className="p-4 border-t border-border bg-background/80 backdrop-blur-sm sticky bottom-0">
        <div className="grid grid-cols-2 gap-3">
          <button 
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => {/* TODO: Handle messages */}}
          >
            <MessageSquare className="h-4 w-4" />
            Messages
          </button>
          <button 
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            onClick={() => {/* TODO: Handle roadblock */}}
          >
            <AlertCircle className="h-4 w-4" />
            Roadblocked?
          </button>
        </div>
      </div>
    </div>
  );
}

interface RightPanelViewProps {
  view: RightPanelView;
  children: React.ReactNode;
}

export function RightPanelView({ view, children }: RightPanelViewProps) {
  const { currentView } = useRightPanel();
  
  if (currentView !== view) return null;
  
  return <>{children}</>;
}

// Utility hook to control the right panel
export function useRightPanelControls() {
  const { openPanel, currentView } = useRightPanel();
  
  return {
    openPanel,
    currentView,
  };
}
