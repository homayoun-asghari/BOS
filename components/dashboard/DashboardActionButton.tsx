"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardActionButtonProps {
  className?: string;
  onClick?: () => void;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function DashboardActionButton({ 
  className,
  onClick,
  isLoading = false,
  children = 'Start'
}: DashboardActionButtonProps) {
  return (
    <div className={cn("sticky bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm", className)}>
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <Button 
            size="lg" 
            className="w-full py-6 text-lg font-medium"
            onClick={onClick}
            disabled={isLoading}
          >
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
    </div>
  );
}
