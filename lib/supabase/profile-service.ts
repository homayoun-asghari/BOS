import { supabase } from './client';
import { Post } from '@/types/post';
import { StoredProcedureRoadmap, toRoadmap } from '@/types/roadmap';

interface UserProfile {
  id: string;
  username: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

interface UserStats {
  totalLikes: number;
  totalPosts: number;
  totalPublicNotes: number;
  completedRoadmaps: number;
  completedMilestones: number;
  completedTasks: number;
}

export const profileService = {
  // Search for users by username
  async searchUsers(query: string): Promise<{ data: UserProfile[]; error: Error | null }> {
    try {
      if (!query) {
        return { data: [], error: null };
      }

      const pattern = `%${query.toLowerCase()}%`;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', pattern)
        .order('username');

      if (error) {
        console.error('Error searching users:', error);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('Unexpected error in searchUsers:', err);
      return { data: [], error: err as Error };
    }
  },

  // Get user profile with case-insensitive search
  // Get user profile with case-insensitive search
  async getUserProfile(username: string): Promise<UserProfile | null> {
    try {
      console.log('🔍 [getUserProfile] Starting profile fetch for username:', username);
      
      if (!username) {
        console.error('❌ [getUserProfile] No username provided');
        return null;
      }

      // Log the actual query being made
      const exactQuery = supabase
        .from('profiles')
        .select('*')
        .eq('username', username.toLowerCase())
        .maybeSingle();
      
      console.log('🔍 [getUserProfile] Executing exact match query:', {
        table: 'profiles',
        select: '*',
        where: { username: username.toLowerCase() },
        single: true
      });
      const { data, error } = await exactQuery;

      // If exact match not found, try case-insensitive search
      

      if (error) {
        console.error('❌ [getUserProfile] Error fetching user profile:', error);
        return null;
      }

      if (!data) {
        console.warn('⚠️ [getUserProfile] No profile found for username after all attempts:', username);
        try {
          // First, try to get all profiles with all fields
          console.log('🔍 [getUserProfile] Attempting to fetch all profiles to debug...');
          const { data: allProfiles, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .limit(10);
            
          if (fetchError) {
            console.error('❌ [getUserProfile] Error fetching all profiles:', fetchError);
          } else {
            console.log('🔍 [getUserProfile] First 10 profiles in database with all fields:', JSON.stringify(allProfiles, null, 2));
            
            // Log the usernames we found
            const usernames = allProfiles.map(p => p.username).filter(Boolean);
            console.log('🔍 [getUserProfile] Usernames in database:', usernames);
            
            // Try to find an exact match case-insensitively
            const foundProfile = allProfiles.find(p => 
              p.username && p.username.toLowerCase() === username.toLowerCase()
            );
            
            if (foundProfile) {
              console.log('✅ [getUserProfile] Found matching profile in debug data:', foundProfile);
              return foundProfile as UserProfile;
            }
            
            // Try a direct SQL query using the RPC function
            console.log('🔍 [getUserProfile] Trying direct RPC call to get_user_profile...');
            try {
              const { data: directQuery, error: directError } = await supabase.rpc('get_user_profile', { 
                p_username: username 
              });
              
              if (directError) {
                console.error('❌ [getUserProfile] Direct RPC query error:', directError);
              } else {
                console.log('🔍 [getUserProfile] Direct RPC query result:', directQuery);
                
                if (directQuery && directQuery.length > 0) {
                  console.log('✅ [getUserProfile] Found profile via RPC:', directQuery[0]);
                  return directQuery[0] as UserProfile;
                }
              }
            } catch (rpcError) {
              console.error('❌ [getUserProfile] Error in RPC call:', rpcError);
            }
          }
        } catch (debugError) {
          console.error('❌ [getUserProfile] Debug error:', debugError);
        }
        
        return null;
      }

      console.log('✅ [getUserProfile] Found profile with exact match:', data.id);
      return data as UserProfile;
    } catch (error) {
      console.error('Unexpected error in getUserProfile:', error);
      return null;
    }
  },

   async getUserStats(userId: string, isPublicProfile: boolean = false): Promise<UserStats | null> {
    try {
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(userId)) {
        console.error('Invalid UUID format:', userId);
        return null;
      }

      // Get all stats in a single call
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_user_completed_stats', { target_user_id: userId });

      if (statsError) {
        console.error('Error fetching user stats:', statsError);
        return null;
      }

      // Handle both array and object response formats
      const stats = Array.isArray(statsData) ? statsData[0] : statsData;

      // If this is a public profile view, we need to manually filter for public roadmaps
      if (isPublicProfile) {
        // Get count of only public completed roadmaps
        const { count: publicCompletedRoadmaps } = await supabase
          .from('roadmaps')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'completed')
          .eq('is_public', true);

        // First, get the IDs of public roadmaps
        const { data: publicRoadmaps } = await supabase
          .from('roadmaps')
          .select('id')
          .eq('user_id', userId)
          .eq('is_public', true);
        
        const publicRoadmapIds = publicRoadmaps?.map(r => r.id) || [];

        // Get count of completed milestones in public roadmaps
        const { count: publicCompletedMilestones } = await supabase
          .from('milestones')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'completed')
          .in('roadmap_id', publicRoadmapIds);

        // Get count of completed tasks in public roadmaps
        const { data: publicMilestones } = await supabase
          .from('milestones')
          .select('id')
          .in('roadmap_id', publicRoadmapIds);
          
        const publicMilestoneIds = publicMilestones?.map(m => m.id) || [];
        
        const { count: publicCompletedTasks } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
          .in('milestone_id', publicMilestoneIds);

        return {
          totalLikes: stats?.total_likes || 0,
          totalPosts: stats?.total_posts || 0,
          totalPublicNotes: stats?.public_notes || 0,
          completedRoadmaps: publicCompletedRoadmaps || 0,
          completedMilestones: publicCompletedMilestones || 0,
          completedTasks: publicCompletedTasks || 0,
        };
      }

      // For non-public profiles (like the authenticated user's own dashboard),
      // return all stats including private content
      return {
        totalLikes: stats?.total_likes || 0,
        totalPosts: stats?.total_posts || 0,
        totalPublicNotes: stats?.public_notes || 0,
        completedRoadmaps: stats?.completed_roadmaps || 0,
        completedMilestones: stats?.completed_milestones || 0,
        completedTasks: stats?.completed_tasks || 0,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }
  },

   async getUserPosts(identifier: string): Promise<Post[]> {
    try {
      // First get the user's ID if we have a username
      let userId = identifier;
      if (identifier.includes('@')) { // Check if it looks like an email
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', identifier)
          .single();
        
        if (profileError) {
          console.error('Error finding user by email:', profileError);
          return [];
        }
        userId = profile?.id || identifier;
      } else if (!identifier.includes('-')) { // Check if it looks like a username
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', identifier.toLowerCase())
          .single();
        
        if (profileError) {
          console.error('Error finding user by username:', profileError);
          return [];
        }
        userId = profile?.id || identifier;
      }

      // Fetch posts with media URLs
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        return [];
      }

      // If posts have media_urls as JSONB, convert them to proper URLs
      const processedPosts = posts?.map(post => {
        if (post.media_urls) {
          const processedMediaUrls = Array.isArray(post.media_urls)
            ? post.media_urls.map((url: string | { path: string }) => {
                if (typeof url === 'string' && !url.startsWith('http')) {
                  // Extract filename from path
                  const pathParts = url.split('/');
                  const fileName = pathParts[pathParts.length - 1];
                  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-media/${userId}/${fileName}`;
                }
                if (typeof url === 'object' && 'path' in url) {
                  // Extract filename from path
                  const pathParts = url.path.split('/');
                  const fileName = pathParts[pathParts.length - 1];
                  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-media/${userId}/${fileName}`;
                }
                return url;
              })
            : post.media_urls;
          return { ...post, media_urls: processedMediaUrls };
        }
        return post;
      }) || []; // Preserve original media_urls if they're already URLs

      return processedPosts;
    } catch (error) {
      console.error('Unexpected error in getUserPosts:', error);
      return [];
    }
  },

  async getCurrentRoadmap(userId: string, isPublicOnly: boolean = false) {
    try {
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
        console.error('Invalid UUID format:', userId);
        return null;
      }

      console.log(`Fetching ${isPublicOnly ? 'public ' : ''}current roadmap for user ID:`, userId);
      
      // First get the raw roadmap data
      const { data, error } = await supabase
        .rpc('get_current_roadmap', { user_id: userId });

      if (error) {
        console.error('Error fetching current roadmap:', error);
        return null;
      }

      if (!data) {
        console.log('No current roadmap found for user ID:', userId);
        return null;
      }

      console.log('Raw roadmap data from stored procedure:', data);
      
      // Transform the JSONB response using type converters
      const transformed = toRoadmap(data as StoredProcedureRoadmap);
      console.log('Transformed roadmap:', transformed);
      
      if (!transformed) {
        console.error('Failed to transform roadmap data');
        return null;
      }

      // Filter out non-public roadmaps if isPublicOnly is true
      if (isPublicOnly && !transformed.is_public) {
        console.log('Filtering out private roadmap as requested');
        return null;
      }

      return transformed;
    } catch (error) {
      console.error('Error fetching current roadmap:', error);
      return null;
    }
  },

  async getCompletedRoadmaps(identifier: string, isPublicOnly: boolean = false) {
    try {
      // First get the user's ID if we have a username
      let userId = identifier;
      if (identifier.includes('@')) { // Check if it looks like an email
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', identifier)
          .single();
        
        if (profileError) {
          console.error('Error finding user by email:', profileError);
          return [];
        }
        userId = profile?.id || identifier;
      } else if (!identifier.includes('-')) { // Check if it looks like a username
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', identifier.toLowerCase())
          .single();
        
        if (profileError) {
          console.error('Error finding user by username:', profileError);
          return [];
        }
        userId = profile?.id || identifier;
      }

      const { data, error } = await supabase
        .rpc('get_completed_roadmaps', { 
          user_id: userId,
          is_public_only: isPublicOnly 
        });

      if (error) {
        console.error('Error fetching completed roadmaps:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error fetching completed roadmaps:', error);
      return [];
    }
  },

  async getPublicNotes(identifier: string) {
    try {
      // First get the user's ID if we have a username
      let userId = identifier;
      if (identifier.includes('@')) { // Check if it looks like an email
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', identifier)
          .single();
        
        if (profileError) {
          console.error('Error finding user by email:', profileError);
          return [];
        }
        userId = profile?.id || identifier;
      } else if (!identifier.includes('-')) { // Check if it looks like a username
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', identifier.toLowerCase())
          .single();
        
        if (profileError) {
          console.error('Error finding user by username:', profileError);
          return [];
        }
        userId = profile?.id || identifier;
      }

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true)  // Only fetch public notes
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching public notes:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error fetching public notes:', error);
      return [];
    }
  }
};
