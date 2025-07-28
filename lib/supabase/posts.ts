import { supabase } from '@/lib/supabase/client';
import { roadmapVectorService } from '@/lib/roadmap/roadmap-vector-service';


export type MediaUrl = {
  url: string;
  type: 'image' | 'video';
  path: string; // Storage path for potential cleanup
};

export type CreatePostParams = {
  content: string;
  mediaFiles?: File[];
  mediaType?: 'image' | 'video';
  mediaUrl?: string; // Added to store the uploaded media URL
  roadmapId?: string;
  milestoneId?: string;
  taskId?: string;
};

// Commented out unused type
// type UpdatePostParams = {
//   id: string;
//   content?: string;
//   mediaUrls?: MediaUrl[];
// };

export const createPost = async (post: CreatePostParams) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Process media URLs if any
  const mediaUrls = [];
  
  if (post.mediaUrl && post.mediaType) {
    mediaUrls.push({
      url: post.mediaUrl,
      type: post.mediaType,
      path: post.mediaUrl.split('/').pop() || ''
    });
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      content: post.content,
      media_urls: mediaUrls,
      roadmap_id: post.roadmapId || null,
      milestone_id: post.milestoneId || null,
      task_id: post.taskId || null,
    })
    .select(`
      *,
      profiles:user_id (username, avatar_url)
    `)
    .single();

  if (error) {
    console.error('Error creating post:', error);
    throw error;
  }

  return data;
};

export const getPostsByUserId = async (userId: string, isPublicProfile: boolean = false) => {
  // Get the current user ID for like status
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  // Start building the query
  let query = supabase
    .from('posts')
    .select(`
      *,
      profiles:user_id (username, display_name, avatar_url),
      roadmap:roadmap_id (id, title, is_public, final_goal),
      milestone:milestone_id (id, title, start_date, end_date),
      task:task_id (id, title),
      post_likes!left(user_id)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // If this is a public profile view, only include posts from public roadmaps
  if (isPublicProfile) {
    // Filter posts that are either not linked to any roadmap or linked to a public roadmap
    query = query.or(`roadmap_id.is.null,roadmap.is_public.eq.true`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }

  // Log the raw data for debugging
  console.log(`Fetched posts for user ${userId} (public: ${isPublicProfile}):`, data?.length || 0, 'posts');

  // Transform the data to match the expected structure
  return (data || []).map(post => {
    // Check if the current user has liked this post
    const isLiked = currentUserId ? 
      Array.isArray(post.post_likes) ? 
        post.post_likes.some((like: { user_id: string }) => like.user_id === currentUserId) : 
        post.post_likes?.user_id === currentUserId : 
      false;

    // Get the like count
    const likeCount = Array.isArray(post.post_likes) ? 
      post.post_likes.length : 
      post.post_likes ? 1 : 0;

    return {
      ...post,
      roadmap: post.roadmap ? {
        ...post.roadmap,
        // Use final_goal as the title if available
        title: post.roadmap.final_goal || post.roadmap.title
      } : null,
      milestone: post.milestone || null,
      task: post.task || null,
      is_liked: isLiked,
      likes_count: likeCount
    };
  });
};

export const getFeedPosts = async (similarOnly: boolean = true) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('Authentication error:', authError);
      return [];
    }

    if (!user) {
      return [];
    }

    console.log('Fetching feed posts for user:', user.id);
    
    // Get similar users if similarOnly is true
    let similarUserIds: string[] = [];
    if (similarOnly) {
      const similarUsers = await roadmapVectorService.findSimilarUsers(user.id, 20, 0.3);
      similarUserIds = similarUsers.map(u => u.user_id);
      // Always include current user's posts
      similarUserIds.push(user.id);
      console.log(`Found ${similarUserIds.length} similar users including self`);
    }
    
    // Build the query
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (username, display_name, avatar_url),
        roadmap:roadmap_id (id, title, is_public, final_goal),
        milestone:milestone_id (id, title, start_date, end_date),
        task:task_id (id, title),
        post_likes!left(user_id)
      `);
      
    // Filter by similar users if needed
    if (similarOnly && similarUserIds.length > 0) {
      query = query.in('user_id', similarUserIds);
    }
    
    // Execute the query
    const { data, error, status, statusText } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase query error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status,
        statusText
      });
      return [];
    }

    // Transform the data to include like status and count for the current user
    const postsWithLikes = (data || []).map(post => {
      // Check if the current user has liked this post
      const isLiked = Array.isArray(post.post_likes) ? 
        post.post_likes.some((like: { user_id: string }) => like.user_id === user.id) : 
        post.post_likes?.user_id === user.id;

      // Get the like count
      const likeCount = Array.isArray(post.post_likes) ? 
        post.post_likes.length : 
        post.post_likes ? 1 : 0;

      return {
        ...post,
        roadmap: post.roadmap ? {
          ...post.roadmap,
          // Use final_goal as the title if available
          title: post.roadmap.final_goal || post.roadmap.title
        } : null,
        milestone: post.milestone || null,
        task: post.task || null,
        is_liked: isLiked,
        likes_count: likeCount
      };
    });

    console.log('Fetched feed posts:', postsWithLikes.length, 'total posts');
    return postsWithLikes;
  } catch (error) {
    console.error('Error in getFeedPosts:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return [];
  }
};

export const deletePost = async (postId: string) => {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};

// Optimized version of toggleLike that uses a stored procedure for atomic operations
export const toggleLike = async (postId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    const { data, error } = await supabase.rpc('toggle_post_like', {
      p_post_id: postId,
      p_user_id: user.id
    });

    if (error) {
      console.error('Error in toggle_post_like RPC:', error);
      throw error;
    }

    return {
      action: data?.action || 'error',
      likeCount: data?.like_count || 0,
      success: true
    };
  } catch (error) {
    console.error('Error in toggleLike:', error);
    throw error;
  }
};

// Keep these for backward compatibility, but they'll use toggleLike internally
export const likePost = async (postId: string) => {
  const result = await toggleLike(postId);
  if (result.action === 'liked') return { success: true, likeCount: result.likeCount };
  throw new Error('Post was already liked');
};

export const unlikePost = async (postId: string) => {
  const result = await toggleLike(postId);
  if (result.action === 'unliked') return { success: true, likeCount: result.likeCount };
  throw new Error('Post was not liked');
};

export const hasUserLikedPost = async (postId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from('post_likes')
    .select('*')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows returned'
    console.error('Error checking like status:', error);
    return false;
  }

  return !!data;
};

export const getPostLikesCount = async (postId: string) => {
  const { count, error } = await supabase
    .from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) {
    console.error('Error getting like count:', error);
    return 0;
  }

  return count || 0;
};
