'use client';

import { useEffect, useState } from 'react';
import { Post } from '@/types/post';
import { useAuth } from '@/components/auth/AuthProvider';
import { getFeedPosts, toggleLike } from '@/lib/supabase/posts';
import { TextDisplay } from '@/components/posts/display/TextDisplay';
import { ImageDisplay } from '@/components/posts/display/ImageDisplay';
import { VideoDisplay } from '@/components/posts/display/VideoDisplay';
import { VoiceDisplay } from '@/components/posts/display/VoiceDisplay';

export function RoadmatesPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [postsLikes, setPostsLikes] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const { user } = useAuth();

  const handleToggleLike = async (postId: string) => {
    if (!user?.id) return { action: 'unliked' as const, likeCount: 0 };
    if (isProcessing[postId]) return { action: 'error' as const, likeCount: postsLikes[postId] || 0 };

    setIsProcessing(prev => ({ ...prev, [postId]: true }));

    const isCurrentlyLiked = likedPosts[postId] || false;
    const newLikedStatus = !isCurrentlyLiked;
    const currentLikes = postsLikes[postId] || 0;
    const newLikeCount = newLikedStatus ? currentLikes + 1 : Math.max(0, currentLikes - 1);

    // Optimistic update
    setLikedPosts(prev => ({
      ...prev,
      [postId]: newLikedStatus
    }));

    setPostsLikes(prev => ({
      ...prev,
      [postId]: newLikeCount
    }));

    try {
      if (newLikedStatus) {
        await toggleLike(postId);
      } else {
        await toggleLike(postId);
      }
      return { 
        action: newLikedStatus ? 'liked' as const : 'unliked' as const,
        likeCount: newLikeCount
      };
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      setLikedPosts(prev => ({
        ...prev,
        [postId]: isCurrentlyLiked
      }));
      setPostsLikes(prev => ({
        ...prev,
        [postId]: currentLikes
      }));
      return { 
        action: isCurrentlyLiked ? 'liked' as const : 'unliked' as const,
        likeCount: currentLikes
      };
    } finally {
      setIsProcessing(prev => ({ ...prev, [postId]: false }));
    }
  };

  useEffect(() => {
    const loadPosts = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        console.log('Fetching feed posts...');
        const feedPosts = await getFeedPosts(true); // Always show similar users for Roadmates tab
        console.log('Raw feed posts from getFeedPosts:', feedPosts);
        
        // Filter out current user's posts and private roadmaps
        const filteredPosts = feedPosts.filter(post => {
          const keep = post.user_id !== user.id && 
                      (!post.roadmap_id || post.roadmap?.is_public === true);
          if (!keep) {
            console.log('Filtering out post:', {
              postId: post.id,
              userId: post.user_id,
              currentUserId: user.id,
              hasRoadmap: !!post.roadmap_id,
              isPublic: post.roadmap?.is_public,
              profiles: post.profiles
            });
          }
          return keep;
        });
        
        console.log('Filtered posts:', filteredPosts.map(p => ({
          id: p.id,
          userId: p.user_id,
          content: p.content,
          profiles: p.profiles
        })));
        setPosts(filteredPosts);
        
        // Initialize likes data
        const likesData: Record<string, boolean> = {};
        const likesCount: Record<string, number> = {};
        
        filteredPosts.forEach(post => {
          likesData[post.id] = post.is_liked || false;
          likesCount[post.id] = post.likes_count || 0;
        });
        
        setLikedPosts(likesData);
        setPostsLikes(likesCount);
      } catch (error) {
        console.error('Error loading feed posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [user?.id]);

  // No need for separate renderPost function anymore

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center">
        <p className="text-lg font-medium">No posts from your roadmates yet</p>
        <p className="text-sm mt-2">Follow more users or check back later!</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
      {posts.map((post) => {
        console.log('Rendering post:', {
          postId: post.id,
          userId: post.user_id,
          currentUserId: user?.id,
          profiles: post.profiles,
          isPrivate: post.roadmap_id && post.roadmap && 'is_public' in post.roadmap ? !post.roadmap.is_public : false,
          isCurrentUser: post.user_id === user?.id,
          roadmap: post.roadmap_id ? {
            id: post.roadmap?.id,
            title: post.roadmap?.title,
            is_public: post.roadmap && 'is_public' in post.roadmap ? post.roadmap.is_public : undefined
          } : null
        });

        if (!post.user_id || post.user_id === user?.id) {
          console.log('Skipping post - no user_id or current user\'s post');
          return null;
        }
        
        const isPrivate = post.roadmap_id && !post.roadmap?.is_public;
        if (isPrivate) {
          console.log('Skipping private post:', post.id);
          return null;
        }
        
        const getMediaType = (media: string | { url: string; path: string; type: string }) => {
          return typeof media === 'string' ? 'image' : media.type;
        };
        
        const getMediaUrl = (media: string | { url: string; path: string; type: string }) => {
          return typeof media === 'string' ? media : media.url;
        };
        
        // User data comes from the profiles join, not directly on the post
        const userData = post.profiles || { username: null, display_name: null, avatar_url: null };
        
        console.log('Creating postUser from:', {
          profiles: post.profiles,
          userData,
          hasDisplayName: !!userData?.display_name,
          hasUsername: !!userData?.username
        });
        
        const postUser = {
          name: userData?.display_name || userData?.username || 'Anonymous',
          display_name: userData?.display_name || userData?.username || 'Anonymous',
          username: userData?.username || 'anonymous',
          avatarUrl: userData?.avatar_url ? String(userData.avatar_url) : ''
        };
        
        console.log('Created postUser:', postUser);
        
        const currentRoadmap = post.roadmap ? {
          id: post.roadmap.id,
          title: post.roadmap.title
        } : undefined;
        
        const commonProps = {
          id: post.id,
          user: postUser,
          timestamp: post.created_at,
          currentRoadmap,
          currentMilestone: post.milestone ? {
            id: post.milestone.id,
            title: post.milestone.title
          } : undefined,
          currentTask: post.task ? {
            id: post.task.id,
            title: post.task.title
          } : undefined,
          likes: postsLikes[post.id] ?? post.like_count ?? 0,
          isLiked: likedPosts[post.id] ?? false,
          onLike: async () => {
            await handleToggleLike(post.id);
          },
          onUnlike: async () => {
            await handleToggleLike(post.id);
          },
          className: isPrivate ? 'opacity-60' : '',
          content: post.content || ''
        };

        return (
          <div key={post.id} className="w-full max-w-md mx-auto mb-8">
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
      })}
    </div>
  );
}
