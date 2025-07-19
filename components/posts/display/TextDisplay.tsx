"use client";

import React, { useRef } from 'react';
import { useLikeAnimation } from '@/hooks/useLikeAnimation';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { TimelineOverlay } from "./TimelineOverlay";
import { PostDisplayProps } from "./PostDisplayProps";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from 'next/link';

interface TextDisplayProps extends PostDisplayProps {
  content: string;
}

export function TextDisplay({
  content,
  timestamp,
  user,
  currentRoadmap,
  currentMilestone,
  currentTask,
  likes,
  onLike,
  className
}: TextDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { triggerLikeAnimation } = useLikeAnimation();

  const handleLike = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    triggerLikeAnimation();
    onLike?.();
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 rounded-lg bg-card",
        className
      )}
      ref={containerRef}
    >
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={user.avatarUrl} />
          <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(timestamp, { addSuffix: true })}
            </span>
          </div>
          <Link
            href={`/profile/${user.username}`}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            @{user.username}
          </Link>
        </div>
      </div>

      <div className="flex-1">
        <TimelineOverlay
          user={{
            name: user.name,
            username: user.username,
            avatarUrl: user.avatarUrl
          }}
          currentRoadmap={{
            id: currentRoadmap.id,
            title: currentRoadmap.title
          }}
          currentMilestone={{
            id: currentMilestone.id,
            title: currentMilestone.title
          }}
          currentTask={{
            id: currentTask.id,
            title: currentTask.title
          }}
        />
        <div
          className="text-2xl leading-relaxed"
        >
          {content}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleLike}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M20 12a8 8 0 01-16 0 8 8 0 0116 0zm-8-5a5 5 0 00-3.586 8.657L16 19l4-5A5 5 0 0012 7z" />
          </svg>
          <span className="ml-2 text-sm">{likes}</span>
        </button>
      </div>

      {likes > 0 && (
        <div className="absolute bottom-4 right-4 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-primary">
          {likes} likes
        </div>
      )}
    </div>
  );
}
