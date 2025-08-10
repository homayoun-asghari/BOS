"use client";

import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { TimelineOverlay } from "./TimelineOverlay";
import { PostDisplayProps } from "./PostDisplayProps";
import { LikeButton } from '../LikeButton';
import { ShareButton } from '../ShareButton';

interface TextDisplayProps extends PostDisplayProps {
  content: string;
}

export function TextDisplay({
  id,
  content,
  user,
  currentRoadmap,
  currentMilestone,
  currentTask,
  likes,
  isLiked,
  onLike,
  className
}: TextDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 group",
        className
      )}
      ref={containerRef}
      style={{
        aspectRatio: '9/16',
        borderRadius: '1rem',
      }}
    >
      <TimelineOverlay
        user={{
          name: user.name || user.username, // Fallback to username if name is not provided
          username: user.username,
          avatarUrl: user.avatarUrl
        }}
        currentRoadmap={currentRoadmap}
        currentMilestone={currentMilestone}
        currentTask={currentTask}
        className="z-10"
      />
      
      <div className="absolute inset-0 flex flex-col p-4">
        <div className="flex-1 relative">
          <div className="h-full pt-28 md:pt-40 lg:pt-48 pb-8 px-6 md:px-8 flex items-start justify-center overflow-y-auto">
            <div className="text-[4.5vw] xs:text-[4vw] sm:text-[3.5vw] md:text-[2.5vw] lg:text-[1.8vw] xl:text-xl text-center leading-tight sm:leading-snug md:leading-normal break-words w-full">
              {content}
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <LikeButton 
            initialLikes={likes}
            initialLiked={isLiked ?? false}
            onLike={async () => {
              if (onLike) {
                await onLike();
              }
              return { 
                action: isLiked ? 'unliked' : 'liked',
                likeCount: isLiked ? likes - 1 : likes + 1
              };
            }}
            className=""
          />
          <ShareButton 
            postId={id} 
          />
        </div>
      </div>
    </div>
  );
}
