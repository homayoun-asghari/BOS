import { useState, useEffect } from 'react';
import { profileService } from '@/lib/supabase/profile-service';
import { Post, Roadmap, Note } from '../types/post';

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

export function useUserProfile(username: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentRoadmap, setCurrentRoadmap] = useState<Roadmap | null>(null);
  const [completedRoadmaps, setCompletedRoadmaps] = useState<Array<{
    id: string;
    title: string;
    completed_at: string;
    total_milestones: number;
    completed_milestones: number;
  }>>([]);
  const [publicNotes, setPublicNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!username) {
        console.warn('No username provided to useUserProfile');
        return;
      }
      
      try {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }
        
        console.log('Fetching profile data for username:', username);
        
        // 1. Fetch basic profile
        const profileData = await profileService.getUserProfile(username);
        console.log('Profile data received:', { hasData: !!profileData, username });
        
        if (!profileData) {
          if (isMounted) {
            setError('User not found');
            setLoading(false);
          }
          return;
        }
        
        if (isMounted) {
          setProfile(profileData);
        }

        // 2. Initialize with default values for new users
        const defaultStats = {
          totalLikes: 0,
          totalPosts: 0,
          totalPublicNotes: 0,
          completedRoadmaps: 0,
          completedMilestones: 0,
          completedTasks: 0
        };
        
        if (isMounted) {
          setStats(defaultStats);
          setPosts([]);
          setCurrentRoadmap(null);
          setCompletedRoadmaps([]);
          setPublicNotes([]);
        }
        
        try {
          console.log('Fetching additional profile data for user ID:', profileData.id);
          
          // 3. Try to fetch additional data, but don't fail if it doesn't exist yet
          const [
            statsData,
            postsData,
            roadmapData,
            completedRoadmapsData,
            publicNotesData
          ] = await Promise.all([
            profileService.getUserStats(profileData.id).catch(err => {
              console.error('Error fetching user stats:', err);
              return defaultStats;
            }),
            profileService.getUserPosts(profileData.id).catch(err => {
              console.error('Error fetching user posts:', err);
              return [];
            }),
            profileService.getCurrentRoadmap(profileData.id).catch(err => {
              console.error('Error fetching current roadmap:', err);
              return null;
            }),
            profileService.getCompletedRoadmaps(profileData.id).catch(err => {
              console.error('Error fetching completed roadmaps:', err);
              return [];
            }),
            profileService.getPublicNotes(profileData.id).catch(err => {
              console.error('Error fetching public notes:', err);
              return [];
            })
          ]);

          console.log('Additional profile data loaded:', {
            stats: !!statsData,
            posts: postsData?.length || 0,
            roadmap: !!roadmapData,
            completedRoadmaps: completedRoadmapsData?.length || 0,
            publicNotes: publicNotesData?.length || 0
          });

          // Only update if component is still mounted
          if (isMounted) {
            if (statsData) setStats(statsData);
            if (postsData) setPosts(postsData);
            if (roadmapData) setCurrentRoadmap(roadmapData);
            if (completedRoadmapsData) setCompletedRoadmaps(completedRoadmapsData);
            if (publicNotesData) setPublicNotes(publicNotesData);
          }
        } catch (err) {
          console.error('Error in parallel profile data fetch:', err);
          // Don't set error here - we already have default values
        }
        
      } catch (err) {
        console.error('Error in profile data fetch:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load profile');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    if (username) {
      fetchData();
    }
    
    return () => {
      isMounted = false;
    };
  }, [username]);

  return {
    profile,
    stats,
    posts,
    currentRoadmap,
    completedRoadmaps,
    publicNotes,
    loading,
    error
  };
}
