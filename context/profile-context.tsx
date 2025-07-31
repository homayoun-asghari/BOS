"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from '@/components/utils/SearchParamsProvider';
import { profileService } from '@/lib/supabase/profile-service';
import { Post, Roadmap, Note } from '@/types/post';

interface UserProfile {
  id: string;
  username: string | null;
  email?: string;  // Made optional with ?
  avatar_url: string | null;
  created_at: string;
}

interface SearchUser {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url: string | null;
}

interface UserStats {
  totalLikes: number;
  totalPosts: number;
  totalPublicNotes: number;
  completedRoadmaps: number;
  completedMilestones: number;
  completedTasks: number;
}

interface ProfileContextType {
  profile: UserProfile | null;
  stats: UserStats | null;
  posts: Post[];
  currentRoadmap: Roadmap | null;
  completedRoadmaps: Array<{
    id: string;
    title: string;
    completed_at: string;
    total_milestones: number;
    completed_milestones: number;
  }>;
  publicNotes: Note[];
  loading: boolean;
  error: string | null;
  selectedUser: string | null;
  setSelectedUser: (username: string | null) => void;
  searchUsers: (query: string) => Promise<void>;
  searchResults: SearchUser[];
  isSearching: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  // router is intentionally unused - kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _router = useRouter();
  const searchParams = useSearchParams();
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
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    username: string;
    avatar_url: string | null;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Handle URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const profileParam = searchParams.get('profile');
      if (profileParam) {
        setSelectedUser(profileParam);
      } else {
        setSelectedUser(null);
      }
    };

    // Handle initial URL
    handleUrlChange();

    // Add popstate event listener for back/forward navigation
    window.addEventListener('popstate', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [searchParams]);

  // Clear all profile data when selectedUser is null
  useEffect(() => {
    if (!selectedUser) {
      setProfile(null);
      setStats(null);
      setPosts([]);
      setCurrentRoadmap(null);
      setCompletedRoadmaps([]);
      setPublicNotes([]);
      setLoading(false);
      setError(null);
    }
  }, [selectedUser]);

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const searchUsers = async (query: string) => {
    try {
      setIsSearching(true);
      setSearchResults([]);

      // Clear any existing timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Create a new timeout to debounce the search
      const timeout = setTimeout(async () => {
        if (query.trim()) {
          const normalizedQuery = query.replace(/\s+/g, '_');
          const { data, error } = await profileService.searchUsers(normalizedQuery);
          
          if (error) {
            console.error('Error searching users:', error);
            setSearchResults([]);
          } else {
            setSearchResults(data.map(user => ({
              id: user.id,
              username: user.username || '',
              display_name: user.display_name || null,
              avatar_url: user.avatar_url
            })) || []);
          }
        } else {
          setSearchResults([]);
        }
      }, 300);

      setSearchTimeout(timeout);
    } catch (err) {
      console.error('Error in searchUsers:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (!selectedUser) {
      // Clear all profile data when selectedUser is null
      if (isMounted) {
        setProfile(null);
        setStats(null);
        setPosts([]);
        setCurrentRoadmap(null);
        setCompletedRoadmaps([]);
        setPublicNotes([]);
        setLoading(false);
        setError(null);
        return;
      }
    }

    const fetchData = async () => {
      try {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }

        // First fetch the profile to get the correct UUID
        // Only fetch data for the selected user
        if (!selectedUser) {
          setError('No user selected');
          setLoading(false);
          return;
        }

        // Get the user's UUID from the username
        const user = await profileService.getUserProfile(selectedUser);
        if (!user) {
          setError('User not found');
          setLoading(false);
          return;
        }

        // Use the UUID for all service calls
        const userId = user.id;

        if (isMounted) {
          setProfile(user);
        }

        // Fetch stats
        const statsData = await profileService.getUserStats(userId);
        if (isMounted) {
          setStats(statsData || null);
        }

        // Fetch posts for the selected user
        const postsData = await profileService.getUserPosts(userId);
        if (isMounted) {
          setPosts(postsData || []);
        }

        // Fetch current roadmap for the selected user
        // For public profiles, only fetch public roadmaps
        const isPublicProfileView = true; // Always true since we're in the profile context
        const roadmapData = await profileService.getCurrentRoadmap(userId, isPublicProfileView);
        console.log('Profile context - Raw roadmap data:', roadmapData);
        if (isMounted) {
          setCurrentRoadmap(roadmapData);
        }

        // Fetch completed roadmaps for the selected user
        // For public profiles, only fetch public roadmaps
        const completedRoadmapsData = await profileService.getCompletedRoadmaps(userId, isPublicProfileView);
        if (isMounted) {
          setCompletedRoadmaps(completedRoadmapsData || []);
        }

        // Fetch public notes for the selected user
        const notesData = await profileService.getPublicNotes(userId);
        if (isMounted) {
          setPublicNotes(notesData || []);
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch profile data');
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [selectedUser]);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        stats,
        posts,
        currentRoadmap,
        completedRoadmaps,
        publicNotes,
        loading,
        error,
        selectedUser,
        setSelectedUser,
        searchUsers,
        searchResults,
        isSearching,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
