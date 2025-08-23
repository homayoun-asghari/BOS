'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from '@/components/utils/SearchParamsProvider';
import { Post } from '@/types/post';
import { getPostsByUserId, toggleLike } from '@/lib/supabase/posts';
import { TextDisplay } from '@/components/posts/display/TextDisplay';
import { ImageDisplay } from '@/components/posts/display/ImageDisplay';
import { VideoDisplay } from '@/components/posts/display/VideoDisplay';
import { VoiceDisplay } from '@/components/posts/display/VoiceDisplay';
import { PostMenu } from '@/components/posts/PostMenu';
import { useAuth } from '@/components/auth/AuthProvider';
import { EyeOff } from 'lucide-react';
import { useRightPanel } from '../../context/right-panel-context';

interface YourPostsProps {
  isPublicProfile?: boolean;
  onNewPostClick?: () => void;
}

export function YourPosts({ isPublicProfile = false }: YourPostsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedPostId, setSelectedPostId } = useRightPanel();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [postsLikes, setPostsLikes] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  
  // Handle post selection and update URL
  const handlePostClick = (postId: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('post', postId);
    router.push(`?${newParams.toString()}`);
    setSelectedPostId(postId);
  };
  
  // Check for post ID in URL on component load
  useEffect(() => {
    const postId = searchParams.get('post');
    if (postId && postId !== selectedPostId) {
      setSelectedPostId(postId);
    }
  }, [searchParams, selectedPostId, setSelectedPostId]);

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

  const handleToggleLike = async (postId: string): Promise<void> => {
    if (isProcessing[postId]) return;
    
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
    } finally {
      setIsProcessing(prev => ({ ...prev, [postId]: false }));
    }
  };

  const getMediaType = (media: string | { url: string; path: string; type: string }) => {
    return typeof media === 'string' ? 'image' : media.type;
  };
  
  const getMediaUrl = (media: string | { url: string; path: string; type: string }) => {
    return typeof media === 'string' ? media : media.url;
  };

  const renderPost = (post: Post) => {
    // Check if the post is private based on the roadmap's visibility
    // Default to false if roadmap is not available
    const isPrivate = false;
    
    // User data comes from the profiles join
    const userData = post.profiles || { username: null, display_name: null, avatar_url: null };
    const postUser = {
      name: userData?.display_name || userData?.username || 'Anonymous',
      username: userData?.username || 'anonymous',
      avatarUrl: userData?.avatar_url || ''
    };
    
    // Common props for all post types
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
      likes: postsLikes[post.id] ?? 0,
      isLiked: likedPosts[post.id] ?? false,
      onLike: () => handleToggleLike(post.id),
      className: isPrivate ? 'opacity-60' : '',
      content: post.content || ''
    };

    return (
      <div 
        key={post.id} 
        className={`w-full max-w-md mx-auto mb-8 cursor-pointer transition-all relative ${selectedPostId === post.id ? 'ring-2 ring-primary' : ''}`}
        onClick={() => handlePostClick(post.id)}
      >
        {isPrivate && (
          <div className="absolute bottom-4 right-4 z-10 bg-background/80 backdrop-blur-sm rounded-full p-2">
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        {/* owner post menu */}
        <div
          className="absolute top-3 right-3 z-20"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <PostMenu
            postId={post.id}
            mediaUrls={post.media_urls as (string | { path: string })[] }
            isOwner
            onDeleted={() => {
              setPosts((prev) => prev.filter((p) => p.id !== post.id));
            }}
          />
        </div>
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
    );
  };

  // Sort posts with newest first
  const sortedPosts = [...posts].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA;
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
      {sortedPosts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            You haven&apos;t created any posts yet.
          </p>
        </div>
      ) : (
        sortedPosts.map(renderPost)
      )}
    </div>
  );
}
