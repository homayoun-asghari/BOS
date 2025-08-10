"use client";

import { TimelineOverlay } from "./TimelineOverlay";
import { cn } from "@/lib/utils";
import { LikeButton } from '../LikeButton';
import { ShareButton } from '../ShareButton';
import { PostDisplayProps } from './PostDisplayProps';

interface ImageDisplayProps extends Omit<PostDisplayProps, 'content'> {
  imageUrl: string;
}

export function ImageDisplay({
  id,
  user,
  imageUrl,
  currentRoadmap,
  currentMilestone,
  currentTask,
  likes,
  onLike,
  isLiked,
  className,
}: ImageDisplayProps) {
  // Like/Unlike handlers are passed directly to LikeButton

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl overflow-hidden bg-black",
        className
      )}
      style={{
        aspectRatio: '9/16',
      }}
    >
      <div className="absolute inset-0 flex flex-col">
        {/* Image */}
        <div className="relative flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={imageUrl} 
            alt="Post" 
            className="w-full h-full object-cover"
          />

          {/* Timeline Overlay */}
          <TimelineOverlay
            user={{
              name: user.name || user.username, // Fallback to username if name is not provided
              username: user.username,
              avatarUrl: user.avatarUrl
            }}
            currentRoadmap={currentRoadmap ? {
              id: currentRoadmap.id,
              title: currentRoadmap.title
            } : null}
            currentMilestone={currentMilestone ? {
              id: currentMilestone.id,
              title: currentMilestone.title
            } : null}
            currentTask={currentTask ? {
              id: currentTask.id,
              title: currentTask.title
            } : null}
            className="z-10"
          />

          {/* Like and Share Buttons */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <LikeButton 
              initialLikes={likes}
              initialLiked={!!isLiked}
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
    </div>
  );
}
