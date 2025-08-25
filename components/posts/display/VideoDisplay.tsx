"use client";

import { Play, Pause } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { TimelineOverlay } from "./TimelineOverlay";
import { cn } from "@/lib/utils";
import { LikeButton } from '../LikeButton';
import { ShareButton } from '../ShareButton';

import { PostDisplayProps } from './PostDisplayProps';

interface VideoDisplayProps extends Omit<PostDisplayProps, 'content'> {
  videoUrl: string;
}

export function VideoDisplay({
  id,
  user,
  videoUrl,
  currentRoadmap,
  currentMilestone,
  currentTask,
  likes,
  onLike,
  isLiked,
  className,
}: VideoDisplayProps) {

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const hideControlsTimer = useRef<number | null>(null);
  
  // Like/Unlike handlers are passed directly to LikeButton

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

  // Cleanup any pending timers on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) {
        window.clearTimeout(hideControlsTimer.current);
        hideControlsTimer.current = null;
      }
    };
  }, []);

  const revealControlsTemporarily = () => {
    if (!isPlaying) return; // When paused, controls are visible anyway
    setShowControls(true);
    if (hideControlsTimer.current) {
      window.clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = window.setTimeout(() => {
      setShowControls(false);
    }, 1500);
  };

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
        <div
          className="relative flex-1"
          onMouseEnter={revealControlsTemporarily}
          onMouseMove={revealControlsTemporarily}
          onMouseLeave={() => {
            if (isPlaying) setShowControls(false);
          }}
          onTouchStart={revealControlsTemporarily}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            playsInline
          />

          {/* Timeline Overlay */}
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

          {/* Play/Pause Control Overlay (only center button is clickable) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Dim background only when paused */}
            <div
              className={cn(
                "absolute inset-0 transition-colors duration-300",
                isPlaying ? "bg-transparent" : "bg-black/40 hover:bg-black/50"
              )}
            />
            <button
              className={cn(
                "relative z-10 rounded-full bg-black/60 hover:bg-black/70",
                "text-white w-16 h-16 flex items-center justify-center transition-opacity duration-200",
                // When paused, show button; when playing, show only if user is interacting (hover/touch)
                !isPlaying || showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              )}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const video = videoRef.current;
                if (video) {
                  if (video.paused) {
                    video.play();
                  } else {
                    video.pause();
                  }
                }
              }}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white" />
              )}
            </button>
          </div>

                  {/* Like and Share Buttons */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <LikeButton 
              initialLikes={likes}
              initialLiked={!!isLiked}
              onLike={async () => {
                if (onLike) {
                  await onLike();
                }
                // Controlled by parent; return value unused.
                return { action: 'liked' as const };
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
