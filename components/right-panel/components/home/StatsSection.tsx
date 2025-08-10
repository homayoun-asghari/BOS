'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { useRefresh } from '@/contexts/RefreshContext';

interface UserStats {
  completed_roadmaps: number;
  completed_milestones: number;
  completed_tasks: number;
  total_likes: number;
  total_posts: number;
  public_notes: number;
}

export function StatsSection() {
  // Initialize with default values to avoid loading state
  const [stats, setStats] = useState<Partial<UserStats>>({
    completed_roadmaps: 0,
    completed_milestones: 0,
    completed_tasks: 0,
    total_likes: 0,
    total_posts: 0,
    public_notes: 0, // This will be updated with total notes count
  });
  
  const [totalNotes, setTotalNotes] = useState(0); // New state for total notes
  const [similarPathUsers, setSimilarPathUsers] = useState(0);
  const [completedPathUsers, setCompletedPathUsers] = useState(0);
  
  const { user } = useAuth();
  const { refreshKey } = useRefresh();
  
  // Function to update a specific stat
  const updateStat = (key: keyof UserStats, value: number) => {
    setStats(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Function to fetch total notes count
  const fetchTotalNotes = useCallback(async () => {
    if (!user?.id) return 0;
    
    try {
      const { count, error } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
        
      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching total notes:', error);
      return 0;
    }
  }, [user?.id]);
  
  // Function to fetch users in similar path
  const fetchSimilarPathUsers = useCallback(async () => {
    if (!user?.id) return { similar: 0, completed: 0 };
    
    try {
      // Check if the user has any roadmaps first
      const { count, error: roadmapError } = await supabase
        .from('roadmaps')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
        
      if (roadmapError || !count || count === 0) {
        // New user with no roadmaps yet, return early to avoid vector lookup
        return { similar: 0, completed: 0 };
      }
      
      // Now verify we can find the current user's roadmap vector
      const { data: currentUserVector, error: vectorError } = await supabase
        .from('user_roadmap_vectors')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (vectorError || !currentUserVector) {
        // Silent fail for new users without vectors
        return { similar: 0, completed: 0 };
      }
      
      // Get users with similar paths (lower threshold to 0.5 to find more matches)
      const { data: similarUsers, error } = await supabase
        .rpc('find_similar_users', {
          p_user_id: user.id,
          p_limit: 100,
          p_min_similarity: 0.5, // Lowered from 0.7 to find more matches
          p_score_type: 'cosine'
        });
      
      if (error) {
        console.error('Error in find_similar_users RPC:', error);
        return { similar: 0, completed: 0 };
      }
      
      console.log('Similar users raw response:', similarUsers);
      
      if (similarUsers && similarUsers.length > 0) {
        // Get user IDs of similar users (filter out any null/undefined)
        const userIds = similarUsers
          .map((u: { user_id?: string }) => u?.user_id)
          .filter(Boolean);
        
        console.log('Found similar user IDs:', userIds);
        
        if (userIds.length > 0) {
          // Check which of these users have completed roadmaps
          const { data: completedStats, error: statsError } = await supabase
            .from('user_roadmap_vectors')
            .select('user_id, metadata')
            .in('user_id', userIds);
            
          if (statsError) {
            console.error('Error fetching completed stats:', statsError);
            return { similar: userIds.length, completed: 0 };
          }
          
          console.log('Completed stats:', completedStats);
          
          const completedCount = completedStats?.filter(stat => 
            stat?.metadata?.completed_roadmaps > 0
          ).length || 0;
          
          console.log(`Found ${userIds.length} similar users, ${completedCount} completed`);
          
          return {
            similar: userIds.length,
            completed: completedCount
          };
        }
      }
      
      console.log('No similar users found');
      return { similar: 0, completed: 0 };
    } catch (error) {
      console.error('Error in fetchSimilarPathUsers:', error);
      return { similar: 0, completed: 0 };
    }
  }, [user?.id]);
  
  // Function to fetch and update all stats
  const fetchAllStats = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Fetch stats in parallel
      const [statsResponse, notesCount, pathStats] = await Promise.all([
        supabase.rpc('get_user_completed_stats', { target_user_id: user.id }),
        fetchTotalNotes(),
        fetchSimilarPathUsers()
      ]);
      
      const { data: userStats, error: statsError } = statsResponse;
      
      if (statsError) throw statsError;
      
      const statsData = Array.isArray(userStats) ? userStats[0] : userStats;
      
      if (statsData) {
        setStats(prev => ({
          ...prev,
          completed_roadmaps: statsData.completed_roadmaps || 0,
          completed_milestones: statsData.completed_milestones || 0,
          completed_tasks: statsData.completed_tasks || 0,
          total_likes: statsData.total_likes || 0,
          total_posts: statsData.total_posts || 0,
          public_notes: statsData.public_notes || 0,
        }));
        
        // Update total notes and path stats
        setTotalNotes(notesCount);
        setSimilarPathUsers(pathStats.similar);
        setCompletedPathUsers(pathStats.completed);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [user?.id, fetchTotalNotes, fetchSimilarPathUsers]);
  
  // Listen for specific stat update events
  useEffect(() => {
    const handleTaskUpdate = (e: CustomEvent) => {
      const { completed } = e.detail;
      // Update tasks count
      updateStat('completed_tasks', 
        completed 
          ? (stats.completed_tasks || 0) + 1 
          : Math.max(0, (stats.completed_tasks || 0) - 1)
      );
      
      // We'll update milestones count optimistically, but the next refresh will correct it if needed
      if (completed) {
        updateStat('completed_milestones', (stats.completed_milestones || 0) + 1);
      } else {
        updateStat('completed_milestones', Math.max(0, (stats.completed_milestones || 0) - 1));
      }
    };
    
    // @ts-expect-error - CustomEvent type needs to be handled
    window.addEventListener('taskStatusChange', handleTaskUpdate);
    
    return () => {
      // @ts-expect-error - CustomEvent type needs to be handled
      window.removeEventListener('taskStatusChange', handleTaskUpdate);
    };
  }, [stats.completed_tasks, stats.completed_milestones]);
  
  // Memoize fetchAllStats to prevent infinite loops
  const memoizedFetchAllStats = useCallback(() => {
    fetchAllStats();
  }, [fetchAllStats]);

  // Initial fetch and refresh on user/refreshKey change
  useEffect(() => {
    memoizedFetchAllStats();
  }, [memoizedFetchAllStats, refreshKey]);
  
  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      memoizedFetchAllStats();
    };
    
    window.addEventListener('refreshStats', handleRefresh);
    return () => {
      window.removeEventListener('refreshStats', handleRefresh);
    };
  }, [memoizedFetchAllStats]);

  return (
    <div className="p-4 space-y-4">
      {/* Similar Path Stats - Full width rows at the top */}
      <div className="space-y-2">
        <div className="w-full p-3 bg-muted/20 rounded-lg">
          <div className="text-center">
            <span className="text-2xl font-bold">{similarPathUsers}</span>
            <p className="text-sm text-muted-foreground">People on similar paths</p>
          </div>
        </div>
        <div className="w-full p-3 bg-muted/20 rounded-lg">
          <div className="text-center">
            <span className="text-2xl font-bold">{completedPathUsers}</span>
            <p className="text-sm text-muted-foreground">Completed similar paths</p>
          </div>
        </div>
      </div>

      {/* Regular Stats Grid */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
          <span className="text-xl font-bold">{stats.total_likes || 0}</span>
          <span className="text-xs text-muted-foreground">Likes</span>
        </div>
        <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
          <span className="text-xl font-bold">{stats.total_posts || 0}</span>
          <span className="text-xs text-muted-foreground">Posts</span>
        </div>
        <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
          <span className="text-xl font-bold">{totalNotes}</span>
          <span className="text-xs text-muted-foreground">Notes</span>
        </div>
        <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
          <span className="text-xl font-bold">{stats.completed_roadmaps || 0}</span>
          <span className="text-xs text-muted-foreground">Roadmaps</span>
        </div>
        <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
          <span className="text-xl font-bold">{stats.completed_milestones || 0}</span>
          <span className="text-xs text-muted-foreground">Milestones</span>
        </div>
        <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
          <span className="text-xl font-bold">{stats.completed_tasks || 0}</span>
          <span className="text-xs text-muted-foreground">Tasks</span>
        </div>
      </div>
    </div>
  );
}
