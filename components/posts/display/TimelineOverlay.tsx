"use client";

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface TimelineOverlayProps {
  user: {
    name: string;
    username: string;
    avatarUrl?: string;
    display_name?: string;
  };
  currentRoadmap: {
    id: string;
    title: string;
  } | null;
  currentMilestone: {
    id: string;
    title: string;
  } | null;
  currentTask: {
    id: string;
    title: string;
  } | null;
  className?: string;
}

export function TimelineOverlay({
  user = { name: 'Unknown User', username: 'unknown', avatarUrl: '' },
  currentRoadmap = null,
  currentMilestone = null,
  currentTask = null,
  className
}: Partial<TimelineOverlayProps>) {
  // Timestamp related code removed as per user request

  // Only show the timeline if we have at least one of roadmap, milestone, or task
  const showTimeline = currentRoadmap || currentMilestone || currentTask;

  return (
    <div className={cn(
      "absolute top-0 left-0 right-0 p-3",
      "bg-gradient-to-b from-background/90 via-background/70 to-transparent",
      "dark:from-foreground/10 dark:via-foreground/5 dark:to-transparent",
      "backdrop-blur-sm",
      "text-foreground dark:text-foreground/90",
      "rounded-t-[1rem]",
      className
    )}>
      <div className="flex flex-col gap-2">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <Link href={`/dashboard?profile=${user?.username || 'unknown'}`} className="flex items-center gap-2">
            <Avatar className="h-8 w-8 border border-foreground/20">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="bg-foreground text-background text-xs font-bold">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-0">
              <p className="text-sm font-semibold text-foreground leading-tight">
                {user?.display_name || user?.name || 'User'}
              </p>
              <p className="text-xs text-foreground/70 leading-tight">
                @{user?.username || 'unknown'}
              </p>
            </div>
          </Link>
        </div>

        {/* Compact Timeline - Only show if we have at least one item */}
        {showTimeline && (
          <div className="mt-2">
            {/* Timeline Container */}
            <div className="w-full px-4 relative">
              {/* Connecting line */}
              <div className="absolute left-0 right-0 h-px bg-foreground/20 top-1 -translate-y-1/2 -z-10" />
              
              <div className="flex items-start w-full">
                {/* Calculate the number of visible nodes */}
                {[currentRoadmap, currentMilestone, currentTask]
                  .filter(Boolean)
                  .map((node, index, nodes) => {
                    if (!node) return null;
                    
                    // Calculate width based on number of nodes (100% / node count)
                    const nodeWidth = 100 / nodes.length;
                    
                    return (
                      <div 
                        key={`${node.id}-${index}`}
                        className="flex flex-col items-center"
                        style={{ width: `${nodeWidth}%` }}
                      >
                        <div className="w-1.5 h-1.5 bg-foreground/90 rounded-full mb-1" />
                        <p className="text-xs font-medium text-foreground/80 truncate max-w-[90%] text-center">
                          {node.title}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
