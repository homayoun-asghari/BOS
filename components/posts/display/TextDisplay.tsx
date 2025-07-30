"use client";

import React, { useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { TimelineOverlay } from "./TimelineOverlay";
import { PostDisplayProps } from "./PostDisplayProps";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from 'next/link';
import { LikeButton } from '../LikeButton';
import { ShareButton } from '../ShareButton';

interface TextDisplayProps extends PostDisplayProps {
  content: string;
}

export function TextDisplay({
  id,
  content,
  timestamp,
  user,
  currentRoadmap,
  currentMilestone,
  currentTask,
  likes,
  isLiked,
  onLike,
  onUnlike,
  className
}: TextDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleLike = async () => {
    try {
      if (onLike) await onLike();
      return true;
    } catch (error) {
      console.error('Error liking post:', error);
      return false;
    }
  };

  const handleUnlike = async () => {
    try {
      if (onUnlike) await onUnlike();
      return true;
    } catch (error) {
      console.error('Error unliking post:', error);
      return false;
    }
  };

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
        user={user}
        currentRoadmap={currentRoadmap}
        currentMilestone={currentMilestone}
        currentTask={currentTask}
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
            onLike={handleLike}
            onUnlike={handleUnlike}
          />
          <ShareButton 
            postId={id} 
          />
        </div>
      </div>
    </div>
  );
}
