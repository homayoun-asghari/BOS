'use client';

import { useEffect, useState } from 'react';
import { Post } from '@/types/post';
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

  const handleToggleLike = async (postId: string) => {
    if (isProcessing[postId]) return { action: 'error' };
    
    setIsProcessing(prev => ({ ...prev, [postId]: true }));
    
    try {
      const result = await toggleLike(postId);
      
      if (result.action === 'liked') {
        setLikedPosts(prev => ({
          ...prev,
          [postId]: true
        }));
        setPostsLikes(prev => ({
          ...prev,
          [postId]: (prev[postId] || 0) + 1
        }));
      } else {
        setLikedPosts(prev => ({
          ...prev,
          [postId]: false
        }));
        setPostsLikes(prev => ({
          ...prev,
          [postId]: Math.max(0, (prev[postId] || 1) - 1)
        }));
      }
      
      return result;
    } catch (error) {
      console.error('Error toggling like:', error);
      return { action: 'error' };
    } finally {
      setIsProcessing(prev => ({ ...prev, [postId]: false }));
    }
  };

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        const feedPosts = await getFeedPosts();
        setPosts(feedPosts);
        
        // Initialize liked posts state
        const initialLikedState = feedPosts.reduce((acc, post) => ({
          ...acc,
          [post.id]: post.is_liked || false
        }), {});
        
        // Initialize post likes count
        const initialLikesCount = feedPosts.reduce((acc, post) => ({
          ...acc,
          [post.id]: post.likes_count || 0
        }), {});
        
        setLikedPosts(initialLikedState);
        setPostsLikes(initialLikesCount);
      } catch (error) {
        console.error('Error loading feed posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter out posts linked to private roadmaps
  const visiblePosts = posts.filter(post => {
    // Include posts not linked to any roadmap
    if (!post.roadmap_id) return true;
    // Include posts linked to public roadmaps
    return post.roadmap?.is_public === true;
  });

  return (
    <div className="space-y-4 p-4">
      {visiblePosts.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No posts from your roadmates yet.
        </p>
      ) : (
        visiblePosts.map((post) => {
          // Common props for all post types
          const commonProps = {
            id: post.id,
            user: {
              name: post.user?.full_name || post.user?.username || 'Anonymous',
              username: post.user?.username || 'anonymous',
              avatarUrl: post.user?.avatar_url,
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
            likes: postsLikes[post.id] || post.likes_count || 0,
            isLiked: likedPosts[post.id] || post.is_liked || false,
            onLike: () => handleToggleLike(post.id),
            className: 'w-full',
          };

          // Determine post type based on media
          const media = post.media_urls?.[0];
          
          if (media?.type === 'image') {
            return (
              <div key={post.id} className="relative">
                <ImageDisplay
                  {...commonProps}
                  content={post.content}
                  imageUrl={media.url}
                />
              </div>
            );
          } else if (media?.type === 'video') {
            return (
              <div key={post.id} className="relative">
                <VideoDisplay
                  {...commonProps}
                  content={post.content}
                  videoUrl={media.url}
                />
              </div>
            );
          } else if (media?.type === 'voice') {
            return (
              <div key={post.id} className="relative">
                <VoiceDisplay
                  {...commonProps}
                  audioUrl={media.url}
                />
              </div>
            );
          } else {
            return (
              <div key={post.id} className="relative">
                <TextDisplay
                  {...commonProps}
                  content={post.content}
                />
              </div>
            );
          }
        })
      )}
    </div>
  );
}
