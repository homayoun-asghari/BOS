import { supabase } from '@/lib/supabase/client';

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

type UpdatePostParams = {
  id: string;
  content?: string;
  mediaUrls?: MediaUrl[];
};

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

export const getPostsByUserId = async (userId: string) => {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles:user_id (username, avatar_url)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }

  return data;
};

export const getFeedPosts = async () => {
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
    
    // Get posts with author profile info and like count
    const { data, error, status, statusText } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
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

    console.log('Fetched feed posts:', data?.length || 0);
    return data || [];
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
