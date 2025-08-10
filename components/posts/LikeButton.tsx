"use client";

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ThumbsUp } from 'lucide-react';

interface LikeButtonProps {
  initialLikes: number;
  initialLiked: boolean;
  onLike: () => Promise<{ action: 'liked' | 'unliked', likeCount?: number }>;
  className?: string;
}

export function LikeButton({
  initialLikes,
  initialLiked,
  onLike,
  className,
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [isLoading, setIsLoading] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setIsLiked(initialLiked);
    setLikesCount(initialLikes);
  }, [initialLiked, initialLikes]);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    // Optimistically update the UI
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikesCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));
    
    try {
      setIsLoading(true);
      const result = await onLike();
      
      // Update with server response if different from our optimistic update
      if (result.action === 'liked' && !newLikedState || 
          result.action === 'unliked' && newLikedState) {
        setIsLiked(result.action === 'liked');
        if (typeof result.likeCount !== 'undefined') {
          setLikesCount(result.likeCount);
        } else {
          setLikesCount(prev => result.action === 'liked' ? prev + 1 : Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      setIsLiked(!newLikedState);
      setLikesCount(prev => newLikedState ? Math.max(0, prev - 1) : prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 text-white transition-colors hover:bg-black/40",
          isLiked && "text-red-500",
          isLoading && "opacity-70 cursor-not-allowed"
        )}
        disabled={isLoading}
        aria-label={isLiked ? "Unlike" : "Like"}
      >
        <ThumbsUp 
          className={cn(
            "w-5 h-5 transition-transform duration-200",
            isLiked ? "fill-current" : "stroke-2"
          )}
        />
        {likesCount > 0 && (
          <span className="text-sm font-medium">
            {likesCount}
          </span>
        )}
      </button>
    </div>
  );
}
