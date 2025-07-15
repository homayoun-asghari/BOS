"use client";

import { Button } from '@/components/ui/button';
import { useLikeAnimation } from '@/hooks/useLikeAnimation';
import { ThumbsUp, Play, Pause } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { TimelineOverlay } from "./TimelineOverlay";
import { cn } from "@/lib/utils";

interface VideoDisplayProps {
  id: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
  videoUrl: string;
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

export function VideoDisplay({
  id,
  user,
  videoUrl,
  timestamp,
  currentRoadmap,
  currentMilestone,
  currentTask,
  likes,
  onLike,
  className,
}: VideoDisplayProps) {

  const { isAnimating, triggerLikeAnimation } = useLikeAnimation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.addEventListener('play', () => setIsPlaying(true));
      video.addEventListener('pause', () => setIsPlaying(false));
    }

    return () => {
      if (video) {
        video.removeEventListener('play', () => setIsPlaying(true));
        video.removeEventListener('pause', () => setIsPlaying(false));
      }
    };
  }, []);

  return (
    <div className={cn(
      "relative w-full rounded-2xl",
      className
    )} style={{
      aspectRatio: '9/16',
      position: 'relative'
    }}>
      {/* Video */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
        playsInline
      />

      {/* Play/Pause Button Overlay */}
      <button
        className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors duration-300 video-play-button"
        onClick={() => {
          const video = videoRef.current;
          if (video) {
            if (video.paused) {
              video.play();
            } else {
              video.pause();
            }
          }
        }}
        style={{
          opacity: isPlaying ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
      >
        {isPlaying ? (
          <Pause className="w-12 h-12 text-white" />
        ) : (
          <Play className="w-12 h-12 text-white" />
        )}
      </button>


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
          onClick={() => {
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
