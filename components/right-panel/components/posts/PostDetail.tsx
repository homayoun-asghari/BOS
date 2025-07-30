'use client';

import { useState, useEffect } from 'react';
import { Post } from '@/types/post';
import { useAuth } from '@/components/auth/AuthProvider';
import { getPostById, toggleLike } from '@/lib/supabase/posts';
import { TextDisplay } from '@/components/posts/display/TextDisplay';
import { ImageDisplay } from '@/components/posts/display/ImageDisplay';
import { VideoDisplay } from '@/components/posts/display/VideoDisplay';
import { VoiceDisplay } from '@/components/posts/display/VoiceDisplay';
import { PostMenu } from '@/components/posts/PostMenu';
import { useRightPanel } from '../../context/right-panel-context';

interface PostDetailProps {
  postId?: string;
}

export function PostDetail({ postId }: PostDetailProps = {}) {
  const { selectedPostId } = useRightPanel();
  const effectivePostId = postId || selectedPostId;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const loadPost = async () => {
      if (!effectivePostId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const postData = await getPostById(effectivePostId);
        
        if (postData) {
          setPost(postData);
          setIsLiked(postData.is_liked || false);
          setLikeCount(postData.likes_count || 0);
        }
      } catch (error) {
        console.error('Error loading post:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [effectivePostId]);

  const handleToggleLike = async (): Promise<void> => {
    if (!user?.id || isProcessing || !post || !effectivePostId) return;
    setIsProcessing(true);

    // Optimistically update UI
    const previousLiked = isLiked;
    const previousCount = likeCount;
    
    // Update UI state first (optimistic update)
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? Math.max(0, prev - 1) : prev + 1);

    try {
      await toggleLike(effectivePostId);
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
    } finally {
      setIsProcessing(false);
    }
  };

  const getMediaType = (media: string | { url: string; path: string; type: string }) => {
    return typeof media === 'string' ? 'image' : media.type;
  };
  
  const getMediaUrl = (media: string | { url: string; path: string; type: string }) => {
    return typeof media === 'string' ? media : media.url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
        <p className="text-lg font-medium">Post not found</p>
        <p className="text-sm mt-2 text-muted-foreground">The post may have been deleted or is not available</p>
      </div>
    );
  }

  // User data comes from the profiles join
  const userData = post.profiles || { username: null, display_name: null, avatar_url: null };
  const postUser = {
    name: userData?.display_name || userData?.username || 'Anonymous',
    display_name: userData?.display_name || userData?.username || 'Anonymous',
    username: userData?.username || 'anonymous',
    avatarUrl: userData?.avatar_url ? String(userData.avatar_url) : ''
  };
  
  const commonProps = {
    id: post.id,
    user: postUser,
    timestamp: post.created_at,
    currentRoadmap: post.roadmap ? {
      id: post.roadmap.id,
      title: post.roadmap.title
    } : undefined,
    currentMilestone: post.milestone ? {
      id: post.milestone.id,
      title: post.milestone.title
    } : undefined,
    currentTask: post.task ? {
      id: post.task.id,
      title: post.task.title
    } : undefined,
    likes: likeCount,
    isLiked: isLiked,
    onLike: handleToggleLike,
    onUnlike: handleToggleLike,
    content: post.content || '',
    className: 'border-none'
  };

  const isOwner = user?.id && post?.user_id === user.id;

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Post menu */}
      {post && (
        <div className="absolute top-6 right-6 z-20">
          <PostMenu 
            postId={post.id} 
            mediaUrls={post.media_urls as (string | { path: string })[]}
            isOwner={!!isOwner}
            onDeleted={() => {
              // navigate back or close panel
              window.history.back();
            }}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {post.media_urls && post.media_urls.length > 0 && Array.isArray(post.media_urls) ? (
          getMediaType(post.media_urls[0]) === 'image' ? (
            <ImageDisplay 
              {...commonProps} 
              imageUrl={getMediaUrl(post.media_urls[0])}
            />
          ) : getMediaType(post.media_urls[0]) === 'video' ? (
            <VideoDisplay 
              {...commonProps} 
              videoUrl={getMediaUrl(post.media_urls[0])}
            />
          ) : getMediaType(post.media_urls[0]) === 'voice' ? (
            <VoiceDisplay 
              {...commonProps} 
              audioUrl={getMediaUrl(post.media_urls[0])}
            />
          ) : (
            <TextDisplay {...commonProps} />
          )
        ) : (
          <TextDisplay {...commonProps} />
        )}
      </div>
    </div>
  );
}
