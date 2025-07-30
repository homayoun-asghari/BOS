"use client";

import { formatDistanceToNow } from "date-fns";
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
  timestamp,
  currentRoadmap,
  currentMilestone,
  currentTask,
  likes,
  onLike,
  onUnlike,
  isLiked,
  className,
}: ImageDisplayProps) {
  const formattedTime = formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
  });
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
          <img 
            src={imageUrl} 
            alt="Post" 
            className="w-full h-full object-cover"
          />

          {/* Timeline Overlay */}
          <TimelineOverlay
            user={{
              name: user.name,
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
          />

          {/* Like and Share Buttons */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <LikeButton 
              initialLikes={likes}
              initialLiked={!!isLiked}
              onLike={handleLike}
              onUnlike={handleUnlike}
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
