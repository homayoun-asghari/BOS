'use client';

import { useEffect, useState } from 'react';
import { Post } from '@/types/post';
import { getPostsByUserId, toggleLike } from '@/lib/supabase/posts';
import { TextDisplay } from '@/components/posts/display/TextDisplay';
import { ImageDisplay } from '@/components/posts/display/ImageDisplay';
import { VideoDisplay } from '@/components/posts/display/VideoDisplay';
import { VoiceDisplay } from '@/components/posts/display/VoiceDisplay';
import { useAuth } from '@/components/auth/AuthProvider';
import { EyeOff, Heart } from 'lucide-react';
import { hasUserLikedPost, getPostLikesCount } from '@/lib/supabase/posts';

interface YourPostsProps {
  isPublicProfile?: boolean;
}

export function YourPosts({ isPublicProfile = false }: YourPostsProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [postsLikes, setPostsLikes] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const { user } = useAuth();

  useEffect(() => {
    const loadPosts = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const userPosts = await getPostsByUserId(user.id, isPublicProfile);
        setPosts(userPosts);
        
        // Initialize liked posts state
        const initialLikedState = userPosts.reduce((acc, post) => ({
          ...acc,
          [post.id]: post.is_liked || false
        }), {});
        
        // Initialize post likes count
        const initialLikesCount = userPosts.reduce((acc, post) => ({
          ...acc,
          [post.id]: post.likes_count || 0
        }), {});
        
        setLikedPosts(initialLikedState);
        setPostsLikes(initialLikesCount);
      } catch (error) {
        console.error('Error loading user posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [user?.id, isPublicProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleToggleLike = async (postId: string) => {
    if (isProcessing[postId]) return { action: 'error' };
    
    // Optimistically update the UI
    const wasLiked = likedPosts[postId];
    const currentLikes = postsLikes[postId] || 0;
    
    // Update UI immediately
    setLikedPosts(prev => ({
      ...prev,
      [postId]: !wasLiked
    }));
    
    setPostsLikes(prev => ({
      ...prev,
      [postId]: Math.max(0, currentLikes + (wasLiked ? -1 : 1))
    }));
    
    // Track the optimistic update for potential rollback
    const optimisticUpdate = {
      postId,
      wasLiked,
      previousLikes: currentLikes
    };
    
    setIsProcessing(prev => ({ ...prev, [postId]: true }));
    
    try {
      const result = await toggleLike(postId);
      
      // If the server response doesn't match our optimistic update, sync with server
      if ((result.action === 'liked') === wasLiked) {
        // Server response doesn't match our optimistic update, sync with server
        setLikedPosts(prev => ({
          ...prev,
          [postId]: result.action === 'liked'
        }));
        
        if (typeof result.likeCount !== 'undefined') {
          setPostsLikes(prev => ({
            ...prev,
            [postId]: result.likeCount
          }));
        }
      }
      
      return { ...result, success: true };
    } catch (error) {
      console.error('Error toggling like:', error);
      
      // Revert optimistic update on error
      setLikedPosts(prev => ({
        ...prev,
        [postId]: optimisticUpdate.wasLiked
      }));
      
      setPostsLikes(prev => ({
        ...prev,
        [postId]: optimisticUpdate.previousLikes
      }));
      
      return { action: 'error', success: false };
    } finally {
      setIsProcessing(prev => ({ ...prev, [postId]: false }));
    }
  };

  const renderPost = (post: Post) => {
    const isPrivate = post.roadmap_id && !post.roadmap?.is_public;
    
    // Common props for all post types
    const commonProps = {
      id: post.id,
      user: {
        name: post.profiles?.full_name || 'Unknown User',
        username: post.profiles?.username || 'unknown',
        avatarUrl: post.profiles?.avatar_url
      },
      timestamp: post.created_at,
      currentRoadmap: post.roadmap ? {
        id: post.roadmap.id,
        title: post.roadmap.title
      } : null,
      currentMilestone: post.milestone ? {
        id: post.milestone.id,
        title: post.milestone.title
      } : null,
      currentTask: post.task ? {
        id: post.task.id,
        title: post.task.title
      } : null,
      likes: postsLikes[post.id] ?? post.likes_count ?? 0,
      isLiked: likedPosts[post.id] ?? post.is_liked ?? false,
      onLike: () => handleToggleLike(post.id),
      className: isPrivate ? 'relative' : ''
    };

    return (
      <div key={post.id} className="relative aspect-[9/16] w-full">
        {isPrivate && (
          <div className="absolute bottom-4 right-4 z-10 bg-background/80 backdrop-blur-sm rounded-full p-2">
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        {post.media_urls && post.media_urls.length > 0 ? (
          post.media_urls[0].type === 'image' ? (
            <ImageDisplay {...commonProps} content={post.content} imageUrl={post.media_urls[0].url} />
          ) : post.media_urls[0].type === 'video' ? (
            <VideoDisplay {...commonProps} content={post.content} videoUrl={post.media_urls[0].url} />
          ) : post.media_urls[0].type === 'voice' ? (
            <VoiceDisplay {...commonProps} audioUrl={post.media_urls[0].url} />
          ) : (
            <TextDisplay {...commonProps} content={post.content} />
          )
        ) : (
          <TextDisplay {...commonProps} content={post.content} />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4">
      {posts.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          You haven't created any posts yet.
        </p>
      ) : (
        posts.map(renderPost)
      )}
    </div>
  );
}
