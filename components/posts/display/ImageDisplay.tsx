"use client";

import { Button } from '@/components/ui/button';
import { useLikeAnimation } from '@/hooks/useLikeAnimation';
import { ThumbsUp } from 'lucide-react';
import { formatDistanceToNow } from "date-fns";
import { TimelineOverlay } from "./TimelineOverlay";
import { cn } from "@/lib/utils";

interface ImageDisplayProps {
  id: string;
  user: {
    name: string;
    avatarUrl?: string;
    username: string;
  };
  imageUrl: string;
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
  likes: number;
  onLike?: (postId: string) => void;
  className?: string;
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
  className,
}: ImageDisplayProps) {
  const formattedTime = formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
  });
  const { isAnimating, triggerLikeAnimation } = useLikeAnimation();

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl",
        className
      )}
      style={{
        aspectRatio: '9/16',
        position: 'relative'
      }}
    >
      {/* Image */}
      <img src={imageUrl} alt="Post" className="w-full h-full object-cover" />

      {/* Timeline Overlay */}
      <TimelineOverlay
        user={user}
        timestamp={timestamp}
        currentRoadmap={currentRoadmap}
        currentMilestone={currentMilestone}
        currentTask={currentTask}
      />

      {/* Like Button */}
      <div className="absolute bottom-4 left-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={(e) => {
            onLike?.(id);
            triggerLikeAnimation();
          }}
          className="relative bg-black/30 backdrop-blur-sm rounded-full p-2"
        >
          <ThumbsUp 
            className="h-4 w-4 transition-all duration-300 text-white"
            style={{
              transform: isAnimating 
                ? 'scale(1.5) rotate(360deg)'
                : 'scale(1) rotate(0deg)',
              opacity: isAnimating ? 0.8 : 1,
              filter: isAnimating 
                ? 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.8))'
                : 'drop-shadow(0 0 0)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </Button>
      </div>

      {/* Likes Count */}
      {likes > 0 && (
        <div className="absolute bottom-4 right-4 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white">
          {likes} like{likes > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
