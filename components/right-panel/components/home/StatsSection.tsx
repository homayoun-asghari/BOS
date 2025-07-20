'use client';

import { useEffect, useState } from 'react';
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
    public_notes: 0,
  });
  
  const { user } = useAuth();
  const { refreshKey } = useRefresh();
  
  // Function to update a specific stat
  const updateStat = (key: keyof UserStats, value: number) => {
    setStats(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Function to fetch and update all stats
  const fetchAllStats = async () => {
    if (!user?.id) return;
    
    try {
      const { data: userStats, error: statsError } = await supabase
        .rpc('get_user_completed_stats', { target_user_id: user.id });
        
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
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  
  // Listen for specific stat update events
  useEffect(() => {
    const handleTaskUpdate = (e: CustomEvent) => {
      const { completed, taskId } = e.detail;
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
    
    // @ts-ignore - CustomEvent type needs to be handled
    window.addEventListener('taskStatusChange', handleTaskUpdate);
    
    return () => {
      // @ts-ignore
      window.removeEventListener('taskStatusChange', handleTaskUpdate);
    };
  }, [stats.completed_tasks, stats.completed_milestones]);
  
  // Initial fetch and refresh on user/refreshKey change
  useEffect(() => {
    fetchAllStats();
  }, [user?.id, refreshKey]);
  
  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchAllStats();
    };
    
    window.addEventListener('refreshStats', handleRefresh);
    return () => {
      window.removeEventListener('refreshStats', handleRefresh);
    };
  }, [user?.id]);

  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
          <span className="text-xl font-bold">{stats.total_likes || 0}</span>
          <span className="text-xs text-muted-foreground">Likes</span>
        </div>
        <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
          <span className="text-xl font-bold">{stats.total_posts || 0}</span>
          <span className="text-xs text-muted-foreground">Posts</span>
        </div>
        <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
          <span className="text-xl font-bold">{stats.public_notes || 0}</span>
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
