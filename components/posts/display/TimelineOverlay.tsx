"use client";

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface TimelineOverlayProps {
  user: {
    name: string;
    avatarUrl?: string;
    username: string;
  };
  currentRoadmap: {
    id: string;
    title: string;
  };
  currentMilestone: {
    id: string;
    title: string;
  };
  currentTask: {
    id: string;
    title: string;
  };
  className?: string;
}

export function TimelineOverlay({
  user = { name: 'Unknown User', username: 'unknown', avatarUrl: '' },
  // timestamp parameter removed as per user request
  currentRoadmap = { id: '', title: 'No Roadmap' },
  currentMilestone = { id: '', title: 'No Milestone' },
  currentTask = { id: '', title: 'No Task' },
  className
}: Partial<TimelineOverlayProps>) {
  // Timestamp related code removed as per user request

  return (
    <div className={cn(
      "absolute top-0 left-0 right-0 p-4 pb-8",
      "bg-gradient-to-b from-background/80 via-background/50 to-transparent",
      "dark:from-foreground/10 dark:via-foreground/5 dark:to-transparent",
      "backdrop-blur-sm transition-all duration-200 ease-in-out",
      "text-foreground dark:text-foreground/90",
      "hover:from-background/90 hover:via-background/60 hover:to-background/20",
      "dark:hover:from-foreground/20 dark:hover:via-foreground/10 dark:hover:to-foreground/5",
      className
    )}>
      {/* User Info */}
      <div className="flex items-center gap-3 mb-6 pl-14">
        <Link href={`/dashboard?profile=${user?.username || 'unknown'}`} className="flex items-center gap-3 group">
          <Avatar className="h-12 w-12 border-2 border-white/20 group-hover:border-primary/80 transition-colors duration-200">
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback className="bg-foreground text-background font-bold">
              {user?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <p className="font-bold text-base text-foreground group-hover:text-primary transition-colors duration-200">
              {user?.name || 'Unknown User'}
            </p>
            <p className="text-sm font-medium text-foreground/80 group-hover:text-primary/80 transition-colors duration-200">
              @{user?.username || 'unknown'}
            </p>
          </div>
        </Link>
      </div>

      {/* Progress Timeline */}
      <div className="flex items-center justify-between w-full relative px-2">
        {/* Full width connecting line */}
        <div className="absolute left-0 right-0 top-3.5 h-0.5 bg-foreground/20 dark:bg-white/20 -z-10">
          <div className="h-full w-full group-hover:bg-primary/80 transition-colors duration-200"></div>
        </div>
        
        {/* Roadmap */}
        <div className="flex flex-col items-center gap-1.5 relative z-10 group">
          <div className="absolute inset-x-0 top-3.5 h-0.5 bg-foreground/20 dark:bg-white/20 -z-10 group-hover:bg-primary/80 transition-colors duration-200"></div>
          <div className="flex items-center justify-center w-7 h-7 bg-foreground/90 group-hover:bg-primary rounded-full shadow-md transition-colors duration-200">
            <div className="w-3 h-3 bg-primary-foreground rounded-full group-hover:bg-background transition-colors duration-200" />
          </div>
          <p className="text-sm font-semibold text-foreground/90 group-hover:text-foreground truncate w-28 text-center">{currentRoadmap.title}</p>
          <p className="text-xs font-medium text-foreground/70 group-hover:text-primary/80 transition-colors duration-200">Roadmap</p>
        </div>

        {/* Milestone */}
        <div className="flex flex-col items-center gap-1.5 relative z-10 group">
          <div className="absolute inset-x-0 top-3.5 h-0.5 bg-foreground/20 dark:bg-white/20 -z-10 group-hover:bg-primary/80 transition-colors duration-200"></div>
          <div className="flex items-center justify-center w-7 h-7 bg-foreground/90 group-hover:bg-primary rounded-full shadow-md transition-colors duration-200">
            <div className="w-3 h-3 bg-primary-foreground rounded-full group-hover:bg-background transition-colors duration-200" />
          </div>
          <p className="text-sm font-semibold text-foreground/90 group-hover:text-foreground truncate w-28 text-center">{currentMilestone.title}</p>
          <p className="text-xs font-medium text-foreground/70 group-hover:text-primary/80 transition-colors duration-200">Milestone</p>
        </div>

        {/* Task */}
        <div className="flex flex-col items-center gap-1.5 relative z-10 group">
          <div className="absolute inset-x-0 top-3.5 h-0.5 bg-foreground/20 dark:bg-white/20 -z-10 group-hover:bg-primary/80 transition-colors duration-200"></div>
          <div className="flex items-center justify-center w-7 h-7 bg-foreground/90 group-hover:bg-primary rounded-full shadow-md transition-colors duration-200">
            <div className="w-3 h-3 bg-primary-foreground rounded-full group-hover:bg-background transition-colors duration-200" />
          </div>
          <p className="text-sm font-semibold text-foreground/90 group-hover:text-foreground truncate w-28 text-center">{currentTask.title}</p>
          <p className="text-xs font-medium text-foreground/70 group-hover:text-primary/80 transition-colors duration-200">Task</p>
        </div>
      </div>
    </div>
  );
}
