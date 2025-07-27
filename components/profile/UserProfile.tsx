"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, ArrowLeft, MessageCircle, Calendar, BookOpen, CheckCircle, MessageCircle as MessageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/context/profile-context";
import { format } from 'date-fns';
import { RoadmapVisualization } from '@/components/dashboard/roadmap-visualization';
import { StoredProcedureRoadmap, toRoadmap } from '@/types/roadmap';
import { useChatContext } from '@/context/chat-context';
import { useRightPanelControls } from '@/components/right-panel/right-panel';

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
  const { profile, stats, posts, currentRoadmap, completedRoadmaps, /* publicNotes, */ loading, error, setSelectedUser } = useProfile();
  const { startDirectMessage, setActiveConversation } = useChatContext();
  const { openPanel } = useRightPanelControls();
  console.log('UserProfile - Received currentRoadmap:', currentRoadmap);
  const [activeTab, setActiveTab] = useState<'posts' | 'roadmap' | 'history' | 'notes'>('posts');

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-50"></div>
      </div>
    );
  }

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

  // Helper function to render posts
  const renderPost = (post: Post) => {
    if (!post) return null;
    
    // Handle JSONB media_urls
    const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : [];
    const hasMedia = mediaUrls.length > 0;
    const firstMedia = mediaUrls[0];
    const isVideo = firstMedia && typeof firstMedia === 'string' && firstMedia.match(/\.(mp4|webm|ogg)$/i);

    // Get media URL from database
    const getMediaUrl = (url: any) => {
      if (!url) return null;
      
      // Get the user's ID from the profile context
      const userId = profile?.id;
      
      // If it's an object with path property, use that
      if (typeof url === 'object' && url.path) {
        // Extract the filename from the path
        const pathParts = url.path.split('/');
        const fileName = pathParts[pathParts.length - 1];
        
        console.log('Image URL:', {
          original: url,
          full: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-media/${userId}/${fileName}`,
          env: process.env.NEXT_PUBLIC_SUPABASE_URL,
          pathParts: { userId, fileName }
        });
        
        return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-media/${userId}/${fileName}`;
      }
      
      // If it's a string URL, use it as is
      if (typeof url === 'string' && url.startsWith('http')) {
        console.log('Image URL:', {
          original: url,
          full: url,
          env: process.env.NEXT_PUBLIC_SUPABASE_URL
        });
        return url;
      }
      
      // If it's a string path, construct the URL
      if (typeof url === 'string') {
        // Extract the filename from the path
        const pathParts = url.split('/');
        const fileName = pathParts[pathParts.length - 1];
        
        console.log('Image URL:', {
          original: url,
          full: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-media/${userId}/${fileName}`,
          env: process.env.NEXT_PUBLIC_SUPABASE_URL,
          pathParts: { userId, fileName }
        });
        
        return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-media/${userId}/${fileName}`;
      }
      
      return null;
    };

    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {new Date(post.created_at).toLocaleDateString()}
        </p>
        <p>{post.content}</p>
        {hasMedia && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {mediaUrls.map((url: any, index: number) => (
              <div key={index} className="relative w-full h-32">
                {/* Using img element with proper alt text for now */}
                {/* In a real app, consider using next/image for optimization */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={getMediaUrl(url)} 
                  alt={`Post media ${index + 1}`} 
                  className="rounded-lg object-cover h-full w-full"
                  onError={(e) => {
                    console.error('Image load error:', {
                      url: getMediaUrl(url),
                      error: e.target.error
                    });
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ))}
          </div>
        )}
        {isVideo && (
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <video 
              src={getMediaUrl(firstMedia)}
              className="w-full h-full object-cover"
              controls
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        
        <div className="flex items-center text-xs text-muted-foreground gap-4">
          <span>{format(new Date(post.created_at), 'MMM d, yyyy')}</span>
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            <span>{post.like_count}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            <span>{post.comment_count}</span>
          </div>
        </div>
      </div>
    );
  };

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
        <div className="space-y-4 p-4 w-full">
          {posts.length > 0 ? (
            posts.map((post) => (
              <div key={post.id} className="rounded-2xl bg-background/50 p-4">
                {renderPost(post)}
              </div>
            ))
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
              <Avatar className="w-20 h-20 flex-shrink-0">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback>{(profile.username || 'U')[0].toUpperCase()}</AvatarFallback>
              </Avatar>
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
                          // Then open the chat panel to show the conversation
                          openPanel('chat');
                          
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
          <div className="grid grid-cols-3 gap-2 mt-6">
            <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
              <span className="text-xl font-bold">{stats?.totalLikes || 0}</span>
              <span className="text-xs text-muted-foreground">Likes</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
              <span className="text-xl font-bold">{stats?.totalPosts || 0}</span>
              <span className="text-xs text-muted-foreground">Posts</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
              <span className="text-xl font-bold">{stats?.totalPublicNotes || 0}</span>
              <span className="text-xs text-muted-foreground">Notes</span>
            </div>
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
