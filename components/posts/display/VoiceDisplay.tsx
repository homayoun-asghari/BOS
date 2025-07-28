'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { LikeButton } from '../LikeButton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/utils/date';
import WaveSurfer from 'wavesurfer.js';
import { TimelineOverlay } from './TimelineOverlay';

import { PostDisplayProps } from './PostDisplayProps';

interface VoiceDisplayProps extends Omit<PostDisplayProps, 'content'> {
  audioUrl: string;
}

export function VoiceDisplay({
  id,
  audioUrl,
  user,
  currentRoadmap = null,
  currentMilestone = null,
  currentTask = null,
  likes = 0,
  isLiked = false,
  onLike,
  className
}: VoiceDisplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || !containerRef.current) return;

    let wavesurfer: any = null;
    let isMounted = true;
    let controller: AbortController | null = null;

    const initWaveSurfer = async () => {
      try {
        // Create WaveSurfer instance with transparent background
        wavesurfer = WaveSurfer.create({
          container: waveformRef.current!,
          waveColor: 'rgba(239, 68, 68, 0.8)', // Slightly transparent red
          progressColor: 'rgba(185, 28, 28, 0.9)', // Slightly darker red for progress
          cursorColor: 'rgba(185, 28, 28, 0.7)', // Slightly transparent cursor
          barWidth: 2,
          barRadius: 3,
          cursorWidth: 1,
          height: 80,
          barGap: 2,
          responsive: true,
          normalize: true,
          partialRender: true,
          hideScrollbar: true,
          backgroundColor: 'transparent',
          cursorColor: 'transparent',
          progressColor: 'rgba(239, 68, 68, 0.7)',
          waveColor: 'rgba(239, 68, 68, 0.4)'
        });

        // Create a new AbortController for this load
        controller = new AbortController();
        const { signal } = controller;

        // Set up event listeners
        const onReady = () => {
          if (!isMounted) return;
          setDuration(wavesurfer.getDuration());
          wavesurfer.setVolume(1); // Set to full volume by default
          wavesurferRef.current = wavesurfer;
        };

        const onAudioProcess = () => {
          if (!isMounted) return;
          setCurrentTime(wavesurfer.getCurrentTime());
        };

        const onSeek = () => {
          if (!isMounted) return;
          setCurrentTime(wavesurfer.getCurrentTime());
        };

        wavesurfer.on('ready', onReady);
        wavesurfer.on('audioprocess', onAudioProcess);
        wavesurfer.on('seek', onSeek);
        wavesurfer.on('finish', () => setIsPlaying(false));
        wavesurfer.on('pause', () => setIsPlaying(false));
        wavesurfer.on('play', () => setIsPlaying(true));
        wavesurfer.on('error', (error: any) => {
          if (error.name !== 'AbortError') {
            console.error('WaveSurfer error:', error);
          }
        });

        // Load the audio
        await wavesurfer.load(audioUrl, null, signal);

      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error initializing WaveSurfer:', error);
        }
      }
    };

    initWaveSurfer();

    // Clean up function
    return () => {
      isMounted = false;
      
      // Abort any pending requests
      if (controller) {
        controller.abort();
        controller = null;
      }
      
      // Destroy WaveSurfer instance
      if (wavesurfer) {
        try {
          // Remove all event listeners
          wavesurfer.unAll();
          
          // Stop any playing audio
          if (wavesurfer.isPlaying()) {
            wavesurfer.pause();
          }
          
          // Destroy the instance
          setTimeout(() => {
            wavesurfer.destroy();
            wavesurfer = null;
          }, 0);
        } catch (error) {
          console.error('Error cleaning up WaveSurfer:', error);
        }
      }
      
      // Clear the ref
      wavesurferRef.current = null;
    };
  }, [audioUrl]); // Removed volume from dependencies
  
  // Toggle play/pause
  const togglePlayPause = () => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.playPause();
  };

  // Handle seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wavesurferRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const seekRatio = x / rect.width;
    const seekTime = seekRatio * duration;
    
    wavesurferRef.current.seekTo(seekTime);
    setCurrentTime(seekTime);
  };

  return (
    <div className={cn("relative w-full aspect-[9/16] bg-black/5 rounded-lg overflow-hidden flex flex-col group", className)}>
      {/* Timeline Overlay */}
      <TimelineOverlay 
        user={user}
        currentRoadmap={currentRoadmap}
        currentMilestone={currentMilestone}
        currentTask={currentTask}
        className="z-10"
      />
      
      {/* Like Button - Left Side */}
      <div className="absolute left-4 bottom-4 z-10">
        <LikeButton
          initialLikes={likes}
          initialLiked={isLiked}
          onLike={onLike || (async () => ({ action: isLiked ? 'unliked' : 'liked' }))}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="bg-red-100 p-6 rounded-full mb-6 group-hover:bg-red-200/80 transition-colors">
          <svg 
            className="h-12 w-12 text-red-600" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            <path d="M12 6c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
          </svg>
        </div>
        
        <h3 className="text-lg font-medium mb-2">Voice Post</h3>
        <p className="text-sm text-gray-500 mb-6">Tap play to listen</p>
        
        <div className="w-full max-w-md">
          <div 
            ref={containerRef}
            className="h-24 w-full mb-4 relative rounded-lg overflow-hidden"
            onClick={handleSeek}
          >
            <div 
              ref={waveformRef} 
              className="w-full h-full bg-transparent"
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          
          <div className="flex items-center justify-center">
            <Button
              onClick={togglePlayPause}
              size="lg"
              className="rounded-full h-16 w-16 p-0 bg-red-600 hover:bg-red-700 text-white"
            >
              {isPlaying ? (
                <Pause className="h-7 w-7 fill-current" />
              ) : (
                <Play className="h-7 w-7 fill-current ml-1" />
              )}
            </Button>
          </div>
        </div>
      </div>
      

    </div>
  );
}
