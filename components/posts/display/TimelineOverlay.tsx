"use client";

import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface TimelineOverlayProps {
  user: {
    name: string;
    avatarUrl?: string;
  };
  timestamp: string | Date;
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
  user,
  timestamp,
  currentRoadmap,
  currentMilestone,
  currentTask,
  className
}: TimelineOverlayProps) {
  const formattedTime = formatDistanceToNow(new Date(timestamp), { addSuffix: true });

  return (
    <div className={cn("absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-background/80 to-transparent backdrop-blur-sm", className)}>
      {/* User Info */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatarUrl} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{user.name}</p>
          <p className="text-xs text-muted-foreground">{formattedTime}</p>
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="flex items-center justify-between w-full relative">
        {/* Roadmap */}
        <div className="flex flex-col items-center gap-1 relative z-10">
          <div className="absolute left-6 right-6 top-3 h-0.5 bg-gray-200 dark:bg-gray-500/80 -z-10 sm:left-8 sm:right-8"></div>
          <div className="flex items-center justify-center w-6 h-6 bg-primary/10 rounded-full dark:bg-primary/20 shrink-0">
            <div className="w-2.5 h-2.5 bg-primary rounded-full" />
          </div>
          <p className="text-xs font-medium text-foreground truncate w-24 text-center">{currentRoadmap.title}</p>
          <p className="text-xs text-muted-foreground">Roadmap</p>
        </div>

        {/* Milestone */}
        <div className="flex flex-col items-center gap-1 relative z-10">
          <div className="absolute left-6 right-6 top-3 h-0.5 bg-gray-200 dark:bg-gray-500/80 -z-10 sm:left-8 sm:right-8"></div>
          <div className="flex items-center justify-center w-6 h-6 bg-primary/10 rounded-full dark:bg-primary/20 shrink-0">
            <div className="w-2.5 h-2.5 bg-primary rounded-full" />
          </div>
          <p className="text-xs font-medium text-foreground truncate w-24 text-center">{currentMilestone.title}</p>
          <p className="text-xs text-muted-foreground">Milestone</p>
        </div>

        {/* Task */}
        <div className="flex flex-col items-center gap-1 relative z-10">
          <div className="absolute left-6 right-6 top-3 h-0.5 bg-gray-200 dark:bg-gray-500/80 -z-10 sm:left-8 sm:right-8"></div>
          <div className="flex items-center justify-center w-6 h-6 bg-primary/10 rounded-full dark:bg-primary/20 shrink-0">
            <div className="w-2.5 h-2.5 bg-primary rounded-full" />
          </div>
          <p className="text-xs font-medium text-foreground truncate w-24 text-center">{currentTask.title}</p>
          <p className="text-xs text-muted-foreground">Task</p>
        </div>

        {/* Add a full-width line to connect all nodes */}
        <div className="absolute left-0 right-0 top-3 h-0.5 bg-gray-200 dark:bg-gray-500/80 -z-10"></div>
      </div>
    </div>
  );
}
