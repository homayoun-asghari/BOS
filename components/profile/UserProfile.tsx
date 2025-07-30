"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, ArrowLeft, BookOpen, CheckCircle, MessageCircle as MessageIcon } from 'lucide-react';
import { useRouter, useSearchParams } from "next/navigation";
import { useProfile } from "@/context/profile-context";

import { RoadmapVisualization } from '@/components/dashboard/roadmap-visualization';
import { StoredProcedureRoadmap } from '@/types/roadmap';
import { useChatContext } from '@/context/chat-context';
import { useRightPanelControls } from '@/components/right-panel/right-panel';
import { PostThumbnail } from '@/components/posts/display/PostThumbnail';
import { PostDetail } from '@/components/right-panel/components/posts/PostDetail';
import { useRightPanel } from '@/components/right-panel/context/right-panel-context';

// Define the Post type since it's not imported
interface Post {
  id: string;
  content: string;
  media_urls?: (string | { path: string })[] | null;
  created_at: string;
  like_count: number;
  comment_count: number;
}
interface UserProfileProps {
  className?: string;
  onClose?: () => void;
}

export function UserProfile({ className, onClose }: UserProfileProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, stats, posts, currentRoadmap, /* completedRoadmaps, */ /* publicNotes, */ loading, error, setSelectedUser } = useProfile();
  const { startDirectMessage, setActiveConversation } = useChatContext();
  const { openPanel } = useRightPanelControls();
  const { selectedPostId, setSelectedPostId } = useRightPanel();
  console.log('UserProfile - Received currentRoadmap:', currentRoadmap);
  const [activeTab, setActiveTab] = useState<'posts' | 'roadmap' | 'history' | 'notes'>('roadmap');
  
  // Update selectedPostId from URL params when they change
  useEffect(() => {
    const postId = searchParams.get('post');
    if (postId) {
      setSelectedPostId(postId);
      // Set the active tab to posts when a post is selected
      setActiveTab('posts');
    }
  }, [searchParams, setSelectedPostId]);

  // Handle back navigation
  const handleBack = () => {
    console.log('Back button clicked');
    
    // Clear the profile state
    console.log('Clearing profile state');
    setSelectedUser(null);
    
    // On mobile, we want to stay in the panel but go back to the previous view
    // On desktop, the panel will handle its own state
    if (window.innerWidth < 1024) { // lg breakpoint
      console.log('On mobile - updating URL without closing panel');
      // Update URL to remove profile parameter without triggering panel close
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('profile');
      router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
    } else {
      // On desktop, use the onClose prop if provided
      if (onClose) {
        console.log('On desktop - using onClose callback');
        onClose();
      } else {
        // Fallback to default back behavior
        console.log('Navigating back');
        router.back();
      }
    }
  };

  // Early return if no profile data
  if (!profile) {
    return null;
  }

  // if (loading) {
  //   return (
  //     <div className="flex items-center justify-center h-full">
  //       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-50"></div>
  //     </div>
  //   );
  // }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-500">Error loading profile: {error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 p-4 border-b">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-accent rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-semibold">User Profile</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-muted-foreground">User not found</p>
        </div>
      </div>
    );
  }

  // Progress bar component
  interface ProgressProps {
    completed: number;
    total: number;
  }

  const Progress = ({ completed, total }: ProgressProps) => {
    const percentage = Math.round((completed / Math.max(1, total)) * 100);
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  // PostThumbnail component now handles all post rendering types

  // Function to handle tab change
  const handleTabChange = (value: 'posts' | 'roadmap' | 'history' | 'notes') => {
    setActiveTab(value);
  };

  // Calculate stats
  const statsList = [
    { icon: <Heart className="w-4 h-4" />, label: 'Likes', value: stats?.totalLikes || 0 },
    { icon: <BookOpen className="w-4 h-4" />, label: 'Notes', value: stats?.totalPublicNotes || 0 },
    { icon: <CheckCircle className="w-4 h-4" />, label: 'Completed', value: stats?.completedRoadmaps || 0 },
  ];

  // Import HistorySection component
  const HistorySection = dynamic<{ userId?: string }>(
    () => import('@/components/right-panel/components/home/HistorySection').then(mod => mod.HistorySection),
    { ssr: false }
  );

  // Tabs content
  const tabs = [
    {
      value: 'roadmap',
      label: 'Roadmap',
      content: currentRoadmap ? (
        <div className="space-y-4 w-full">
          {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : currentRoadmap ? (
              <RoadmapVisualization 
                roadmap={currentRoadmap}
                progress={currentRoadmap?.milestones?.reduce((total, milestone) => {
                  console.log('UserProfile - Rendering roadmap:', currentRoadmap);
                  console.log('UserProfile - Milestone:', milestone);
                  const totalTasks = milestone.tasks?.length || 0;
                  const completedTasks = milestone.tasks?.filter(task => task.status === 'completed').length || 0;
                  return total + (totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0);
                }, 0) || 0}
                totalTasks={currentRoadmap?.milestones?.reduce((total, milestone) => 
                  total + (milestone.tasks?.length || 0), 0) || 0}
                completedTasks={currentRoadmap?.milestones?.reduce((total, milestone) => 
                  total + (milestone.tasks?.filter(task => task.status === 'completed').length || 0), 0) || 0}
                isDeleteDialogOpen={false}
                isDeleting={false}
                onEditClick={() => {}}
                onDeleteClick={() => {}}
                onDeleteConfirm={() => Promise.resolve()}
                onDeleteCancel={() => {}}
                showActions={false}
                isEditable={false}
                onTaskStatusChange={async () => true}
                key={profile?.id}
              />
            ) : (
              <p className="text-center text-muted-foreground py-8">No public roadmap</p>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No public roadmap</p>
        ),
    },
    {
      value: 'posts',
      label: 'Posts',
      content: (
        <div className="p-4 w-full">
          {selectedPostId ? (
            <div>
              <button 
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams.toString());
                  newParams.delete('post');
                  router.push(`?${newParams.toString()}`);
                  setSelectedPostId(null);
                }}
                className="flex items-center gap-2 mb-4 p-2 hover:bg-accent rounded-md"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to posts</span>
              </button>
              <PostDetail postId={selectedPostId} />
            </div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {posts.map((post) => (
                <div 
                  key={post.id} 
                  className="aspect-[9/16] cursor-pointer"
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams.toString());
                    newParams.set('post', post.id);
                    router.push(`?${newParams.toString()}`);
                    setSelectedPostId(post.id);
                  }}
                >
                  <PostThumbnail 
                    post={post} 
                    userId={profile?.id} 
                    className="w-full h-full rounded-lg" 
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No posts yet</p>
          )}
        </div>
      ),
    },
    // Temporarily hiding Notes tab - keeping the code for future use
    // {
    //   value: 'notes',
    //   label: 'Notes',
    //   content: (
    //     <div className="space-y-4 p-4">
    //       {publicNotes.length > 0 ? (
    //         publicNotes.map((note) => {
    //           // Extract text content from JSON
    //           let contentText = '';
    //           if (note.content) {
    //             if (typeof note.content === 'string') {
    //               // Handle case where content is a string
    //               contentText = note.content.replace(/<[^>]*>?/gm, '');
    //             } else if (note.content.type === 'doc' && Array.isArray(note.content.content)) {
    //               // Handle TipTap JSON structure
    //               const extractText = (node: any): string => {
    //                 if (node.text) return node.text;
    //                 if (node.content && Array.isArray(node.content)) {
    //                   return node.content.map(extractText).join('');
    //                 }
    //                 return '';
    //               };
    //               contentText = note.content.content.map(extractText).join(' ');
    //             } else if (typeof note.content === 'object') {
    //               // Fallback for other JSON structures
    //               contentText = JSON.stringify(note.content).replace(/<[^>]*>?/gm, '');
    //             }
    //           }

    //           return (
    //             <div key={note.id} className="p-4 border rounded-lg">
    //               <h3 className="font-medium">{note.title}</h3>
    //               <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
    //                 {contentText}
    //               </p>
    //               {note.tags && note.tags.length > 0 && (
    //                 <div className="flex flex-wrap gap-2 mt-2">
    //                   {note.tags.map((tag: string) => (
    //                     <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded-full">
    //                       {tag}
    //                     </span>
    //                   ))}
    //                 </div>
    //               )}
    //             </div>
    //           );
    //         })
    //       ) : (
    //         <p className="text-center text-muted-foreground py-8">No public notes yet</p>
    //       )}
    //     </div>
    //   ),
    // },
    {
      value: 'history',
      label: 'History',
      content: (
        <div className="space-y-4 w-full">
          <HistorySection userId={profile.id} />
        </div>
      ),
    },
  ];

  return (
    <div className={cn("flex flex-col h-full overflow-hidden pb-[env(safe-area-inset-bottom)] lg:pb-0", className)}
         style={{ width: 'var(--right-panel-width, 100%)' }}>
      {/* Main Content with Single Scroll */}
      <div className="flex-1 overflow-y-auto p-4" style={{ width: '100%' }}>
        {/* Profile Info */}
        <div className="w-full">

          <div className="flex items-start gap-3 w-full">
            <button 
              onClick={handleBack}
              className="p-1.5 rounded-full hover:bg-accent -ml-1 mt-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <Avatar className="w-20 h-20 border-2 border-background/50 shadow-sm">
                  <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                  <AvatarFallback className="bg-foreground/5 text-foreground/80 text-2xl font-medium">
                    {(profile.username || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1">
                <div>
                  <h1 className="text-2xl font-bold">{profile.display_name || profile.username || 'User'}</h1>
                  <div className="flex items-center gap-2">
                    {profile.display_name && (
                      <span className="text-muted-foreground">@{profile.username}</span>
                    )}
                    <button 
                      className="p-1 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Send direct message"
                      onClick={async (e) => {
                        e.stopPropagation();
                        console.log('DM button clicked');
                        if (!profile?.id) {
                          console.log('No profile ID');
                          return;
                        }
                        
                        try {
                          console.log('Starting direct message with user:', profile.id);
                          // Start a direct message conversation first
                          const conversation = await startDirectMessage(profile.id);
                          console.log('startDirectMessage completed, conversation:', conversation);
                          
                          if (!conversation) {
                            console.error('Failed to start direct message - no conversation returned');
                            return;
                          }
                          
                          console.log('Opening chat panel for conversation:', conversation.id);
                          // Clear selected user so UserProfile view closes
                          setSelectedUser(null);
                          // Set active conversation via context so ChatView picks it up
                          setActiveConversation(conversation.id);
                          // Then open the messages panel to show the conversation
                          openPanel('messages');
                          
                          // Force a small delay to ensure state updates
                          setTimeout(() => {
                            console.log('Current active conversation should be set to:', conversation.id);
                            console.log('Current conversations in state should include new conversation');
                          }, 100);
                          
                        } catch (error) {
                          console.error('Error in DM button click handler:', error);
                        }
                      }}
                      disabled={!profile?.id}
                    >
                      <MessageIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                

              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="space-y-2 mt-6">
            {/* First Row: Likes and Posts */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
                <span className="text-xl font-bold">{stats?.totalLikes || 0}</span>
                <span className="text-xs text-muted-foreground">Likes</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
                <span className="text-xl font-bold">{stats?.totalPosts || 0}</span>
                <span className="text-xs text-muted-foreground">Posts</span>
              </div>
            </div>
            
            {/* Second Row: Roadmaps, Milestones, Tasks */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
                <span className="text-xl font-bold">{stats?.completedRoadmaps || 0}</span>
                <span className="text-xs text-muted-foreground">Roadmaps</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
                <span className="text-xl font-bold">{stats?.completedMilestones || 0}</span>
                <span className="text-xs text-muted-foreground">Milestones</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
                <span className="text-xl font-bold">{stats?.completedTasks || 0}</span>
                <span className="text-xs text-muted-foreground">Tasks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab navigation with underline only for active tab */}
        <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as 'posts' | 'roadmap' | 'history' | 'notes')} className="w-full mt-4">
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-2 w-full">
            <TabsList className="h-10 w-full justify-start rounded-none bg-transparent p-0">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value}
                  className="relative h-10 rounded-none bg-transparent px-6 font-medium text-muted-foreground shadow-none transition-all data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <span className="relative">
                    {tab.label}
                    <span className={`absolute -bottom-px left-0 right-0 h-0.5 bg-primary transition-opacity duration-200 ${
                      activeTab === tab.value ? 'opacity-100' : 'opacity-0'
                    }`} />
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="mt-4 w-full">
            {tabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-0 w-full">
                {tab.content}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  )
}
