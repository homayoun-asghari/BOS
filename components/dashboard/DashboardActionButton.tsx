"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardActionButtonProps {
  className?: string;
  onClick?: () => void;
  isLoading?: boolean;
  children?: React.ReactNode;
  tooltip?: string;
}

export function DashboardActionButton({ 
  className,
  onClick,
  isLoading = false,
  children = 'Start',
  tooltip
}: DashboardActionButtonProps) {
  return (
    <div className={cn("sticky bottom-0 z-30 w-full px-4 pb-6 pt-2 bg-gradient-to-t from-background via-background/90 to-transparent", className)}>
      <div className="max-w-2xl mx-auto pr-[375px]">
        <Button 
          size="lg" 
          className="w-full py-6 text-lg font-medium relative group shadow-lg"
          onClick={onClick}
          disabled={isLoading}
          aria-label={tooltip}
        >
          {tooltip && (
            <span className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 left-1/2 transform -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap">
              {tooltip}
            </span>
          )}
          {isLoading ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin mr-2">⟳</span>
              Loading...
            </span>
          ) : (
            children
          )}
        </Button>
      </div>
    </div>
  );
}
