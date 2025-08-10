import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { createPost, getPostsByUserId, getFeedPosts, deletePost } from '@/lib/supabase/posts';
import { useAuth } from '@/components/auth/AuthProvider';

type Post = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  media_urls?: Array<{ url: string; type: string }>;
  roadmap_id?: string;
  milestone_id?: string;
  task_id?: string;
};

type MediaUrl = {
  url: string;
  type: 'image' | 'video';
};

type CreatePostParams = {
  content: string;
  mediaUrls?: MediaUrl[];
  roadmapId?: string;
  milestoneId?: string;
  taskId?: string;
};

export function usePosts(userId?: string) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  
  // Use the userId from auth if not provided
  const targetUserId = userId || user?.id;
  
  // Determine if this is a public profile view (userId is provided and different from current user)
  const isPublicProfile = !!userId && userId !== user?.id;

  // Fetch user's posts
  const fetchUserPosts = useCallback(async () => {
    if (!targetUserId) return [];
    
    setIsLoading(true);
    setError(null);
    try {
      const posts = await getPostsByUserId(targetUserId, isPublicProfile);
      setUserPosts(posts);
      return posts;
    } catch (err) {
      console.error('Error fetching user posts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch posts'));
      toast.error('Failed to load your posts');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, isPublicProfile]);  // isPublicProfile already includes user?.id

  // Fetch feed posts
  const fetchFeedPosts = useCallback(async () => {
    if (!user) {
      console.log('No authenticated user, returning empty feed');
      return [];
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const posts = await getFeedPosts();
      setFeedPosts(posts);
      return posts;
    } catch (err) {
      console.error('Error fetching feed posts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch feed'));
      toast.error('Failed to load feed');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Create post
  const handleCreatePost = useCallback(
    async (params: CreatePostParams) => {
      setIsLoading(true);
      setError(null);
      try {
        const newPost = await createPost(params);
        // Update local state optimistically
        setUserPosts(prev => [newPost, ...prev]);
        setFeedPosts(prev => [newPost, ...prev]);
        
        toast.success('Post created successfully');
        
        return newPost;
      } catch (err) {
        console.error('Error creating post:', err);
        setError(err instanceof Error ? err : new Error('Failed to create post'));
        toast.error('Failed to create post');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Delete post
  const handleDeletePost = useCallback(
    async (postId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await deletePost(postId);
        // Update local state optimistically
        setUserPosts(prev => prev.filter(post => post.id !== postId));
        setFeedPosts(prev => prev.filter(post => post.id !== postId));
        
        toast.success('Post deleted successfully');
      } catch (err) {
        console.error('Error deleting post:', err);
        setError(err instanceof Error ? err : new Error('Failed to delete post'));
        toast.error('Failed to delete post');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Initial data loading
  useEffect(() => {
    if (targetUserId) {
      fetchUserPosts();
    }
    fetchFeedPosts();
  }, [targetUserId, fetchUserPosts, fetchFeedPosts]);

  return {
    // User posts
    userPosts,
    isLoadingUserPosts: isLoading && userPosts.length === 0,
    userPostsError: error,
    refetchUserPosts: fetchUserPosts,
    
    // Feed posts
    feedPosts,
    isLoadingFeed: isLoading && feedPosts.length === 0,
    feedError: error,
    refetchFeed: fetchFeedPosts,
    
    // Actions
    createPost: handleCreatePost,
    deletePost: handleDeletePost,
    isCreating: false, // This can be tracked with a separate state if needed
    isDeleting: false, // This can be tracked with a separate state if needed
  };
}
