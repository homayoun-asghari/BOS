"use client";

import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { TimelineOverlay } from "./TimelineOverlay";
import { cn } from "@/lib/utils";
import { LikeButton } from '../LikeButton';

interface VideoDisplayProps {
  id: string;
  user: {
    name: string;
    username?: string;
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
  isLiked?: boolean;
  onLike?: () => Promise<void>;
  onUnlike?: () => Promise<void>;
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
  onUnlike,
  isLiked,
  className,
}: VideoDisplayProps) {

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
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
      "relative w-full rounded-2xl overflow-hidden bg-black",
      className
    )} style={{
      aspectRatio: '9/16',
      borderRadius: '1rem',
    }}>
      <div className="absolute inset-0 flex flex-col">
        {/* Video */}
        <div className="relative flex-1">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            playsInline
          />

          {/* Timeline Overlay */}
          <TimelineOverlay
            user={{
              name: user.name,
              username: user.username || 'user',
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

                  {/* Like Button */}
          <div className="absolute bottom-4 left-4 right-4">
            <LikeButton 
              initialLikes={likes}
              initialLiked={!!isLiked}
              onLike={handleLike}
              onUnlike={handleUnlike}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
