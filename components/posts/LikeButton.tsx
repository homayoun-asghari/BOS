"use client";

import { useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      // Delegate state changes to parent (controlled component behavior)
      await onLike();
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={className}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 text-white transition-colors hover:bg-black/40",
          initialLiked && "text-red-500",
          isLoading && "opacity-70 cursor-not-allowed"
        )}
        disabled={isLoading}
        aria-label={initialLiked ? "Unlike" : "Like"}
      >
        <ThumbsUp 
          className={cn(
            "w-5 h-5 transition-transform duration-200",
            initialLiked ? "fill-current" : "stroke-2"
          )}
        />
        {initialLikes > 0 && (
          <span className="text-sm font-medium">
            {initialLikes}
          </span>
        )}
      </button>
    </div>
  );
}
