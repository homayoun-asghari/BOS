"use client";

import React, { useRef, useState, useEffect } from 'react';
import { FileText, Video, Mic, ThumbsUp } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSearchParams } from '@/components/utils/SearchParamsProvider';
import { useRightPanel } from '@/components/right-panel/context/right-panel-context';

interface PostThumbnailProps {
  post: {
    id: string;
    content: string;
    media_urls?: (string | { path: string })[] | null;
    created_at: string;
    type?: 'text' | 'image' | 'video' | 'voice';
    like_count?: number;
    comment_count?: number;
  };
  className?: string;
  userId?: string;
}

export function PostThumbnail({ post, className, userId }: PostThumbnailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSelectedPostId } = useRightPanel();
  
  // Handle post click to update URL and select post
  const handlePostClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Update URL with post ID parameter
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('post', post.id);
    router.push(`?${newParams.toString()}`);
    setSelectedPostId(post.id);
  };
  
  // Determine post type based on media_urls
  const hasMedia = post.media_urls && post.media_urls.length > 0 && post.media_urls[0] !== null;
  let mediaType = post.type || 'text';
  const firstMedia = hasMedia && post.media_urls ? post.media_urls[0] : null;
  
  // Detect media type from URL if not explicitly provided
  if (hasMedia && !post.type) {
    const url = typeof firstMedia === 'string' ? firstMedia : 
              (firstMedia && typeof firstMedia === 'object' && firstMedia.path ? firstMedia.path : '');
    
    console.log(`[PostThumbnail] Detecting media type for post ${post.id}:`, { url });
    
    // Check for URL patterns that might indicate audio content
    if (url.match(/audio|voice|sound|podcast|mp3|wav|ogg|m4a|aac/i) || 
        url.match(/\.(mp3|wav|ogg|m4a|aac|flac|opus|wma|alac)$/i)) {
      console.log(`[PostThumbnail] Detected voice post from URL: ${url}`);
      mediaType = 'voice';
    } 
    // Check for video file extensions
    else if (url.match(/\.(mp4|mov|webm|avi|mkv|flv|wmv)$/i)) {
      console.log(`[PostThumbnail] Detected video post from URL: ${url}`);
      mediaType = 'video';
    } 
    // Check for image file extensions
    else if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)$/i)) {
      console.log(`[PostThumbnail] Detected image post from URL: ${url}`);
      mediaType = 'image';
    }
    
    // If we're still not sure, check the post content for hints
    if (mediaType === 'text' && post.content) {
      if (post.content.match(/audio|voice|sound|recording|speaking|listen/i)) {
        console.log(`[PostThumbnail] Detected likely voice post from content`);
        mediaType = 'voice';
      }
    }
  }
  
  // Force voice type if the mediaType is video but the URL doesn't look like a video URL
  // This is a fallback for misidentified voice posts
  if (mediaType === 'video' && firstMedia) {
    const url = typeof firstMedia === 'string' ? firstMedia : 
              (firstMedia.path || '');
    
    if (url.includes('voice') || url.includes('audio')) {
      console.log(`[PostThumbnail] Correcting video to voice based on URL path for post ${post.id}`);
      mediaType = 'voice';
    }
  }

  // Get the first media URL for display
  const getMediaUrl = (url: string | { path: string } | null | undefined): string | null => {
    if (!url) return null;
    
    // If it's an object with path property
    if (typeof url === 'object' && 'path' in url && url.path) {
      const pathParts = url.path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-media/${userId}/${fileName}`;
    }
    
    // If it's a string URL, use it as is
    if (typeof url === 'string') {
      if (url.startsWith('http')) {
        return url;
      }
      
      // If it's a string path, construct the URL
      const pathParts = url.split('/');
      const fileName = pathParts[pathParts.length - 1];
      return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-media/${userId}/${fileName}`;
    }
    
    return null;
  };

  // Component to handle video thumbnails with frame capture
  const VideoThumbnail = ({ videoUrl }: { videoUrl: string }) => {
    const [thumbnail, setThumbnail] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    
    useEffect(() => {
      const video = videoRef.current;
      
      if (!video || !videoUrl) return;
      
      const generateThumbnail = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setThumbnail(dataUrl);
          }
        } catch (err) {
          console.error('Error generating thumbnail:', err);
        } finally {
          setLoading(false);
        }
      };
      
      // Handle events
      const handleLoadedData = () => {
        // Sometimes we need to wait a bit for the video to be ready
        video.currentTime = 0.1; // Set to a small value to get first frame
        setTimeout(generateThumbnail, 300);
      };
      
      const handleError = () => {
        console.error('Error loading video for thumbnail');
        setLoading(false);
      };
      
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('error', handleError);
      
      // Clean up
      return () => {
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('error', handleError);
      };
    }, [videoUrl]);
    
    return (
      <div 
        className={`relative overflow-hidden bg-black ${className || 'w-full h-full'}`}
        onClick={handlePostClick}
      >
        {/* Hidden video element for thumbnail extraction */}
        <video 
          ref={videoRef} 
          src={videoUrl}
          className="hidden" 
          preload="metadata"
          crossOrigin="anonymous"
          muted
        />
        
        {/* Show thumbnail or loading state */}
        <div className="relative w-full h-full">
          {thumbnail ? (
            <Image 
              src={thumbnail} 
              alt="Video thumbnail"
              className="object-cover"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              {loading ? (
                <div className="h-10 w-10 rounded-full border-2 border-t-transparent border-white animate-spin" />
              ) : (
                <Video className="h-10 w-10 text-white/80" />
              )}
            </div>
          )}
        </div>
        
        {/* Overlay with play icon */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/30 backdrop-blur-sm rounded-full p-2">
              <Video className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-2 right-2 bg-red-500 rounded-full h-2 w-2 animate-pulse"></div>
        
        {/* Like count */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1">
          <ThumbsUp className="h-3 w-3 text-white" />
          <span className="text-xs text-white font-medium">
            {post.like_count || 0}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`aspect-[9/16] rounded-lg overflow-hidden relative ${className || ''}`}
      style={{ minHeight: '200px' }}
    >
      {mediaType === 'image' && hasMedia && firstMedia && (
        <div className="relative w-full h-full">
          <Image 
            src={getMediaUrl(firstMedia) || '/placeholder.png'} 
            alt="Post thumbnail"
            className="object-cover"
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            onError={(e) => {
              // Hide the image on error
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          
          {/* Like count */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1 z-10">
            <ThumbsUp className="h-3 w-3 text-white" />
            <span className="text-xs text-white font-medium">
              {post.like_count || 0}
            </span>
          </div>
        </div>
      )}

      {mediaType === 'video' && hasMedia && firstMedia && (
        <VideoThumbnail videoUrl={getMediaUrl(firstMedia) || ''} />
      )}

      {mediaType === 'voice' && (
        <div className="relative w-full h-full">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-primary/5 flex flex-col items-center justify-center">
            <div className="h-1/2 w-full flex items-center justify-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                <Mic className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="h-1/3 w-4/5 flex items-end pb-8">
              <div className="w-full flex items-center justify-center space-x-1">
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i} 
                    className="bg-primary/70 rounded-full w-1" 
                    style={{
                      height: `${Math.max(10, Math.abs(Math.sin(i * 0.5) * 40))}px`,
                      animationDelay: `${i * 0.1}s`,
                      animation: i % 3 === 0 ? 'pulse 2s infinite' : undefined
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="text-xs text-primary/70 bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
              Audio
            </span>
          </div>
          
          {/* Like count */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1">
            <ThumbsUp className="h-3 w-3 text-white" />
            <span className="text-xs text-white font-medium">
              {post.like_count || 0}
            </span>
          </div>
        </div>
      )}

      {mediaType === 'text' && (
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 w-full h-full flex flex-col p-4 overflow-hidden">
          <div className="flex justify-between items-start">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4 flex-1 overflow-hidden">
            <p className="text-sm line-clamp-5 text-foreground/90 font-medium">
              {post.content}
            </p>
          </div>
          <div className="mt-auto">
            <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1">
              <ThumbsUp className="h-3 w-3 text-white" />
              <span className="text-xs text-white font-medium">{post.like_count || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Overlay with gradient at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
    </div>
  );
}
