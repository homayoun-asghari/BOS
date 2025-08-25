'use client';

import { useState } from 'react';
import { useSearchParams } from '@/components/utils/SearchParamsProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoadmatesPosts } from "./RoadmatesPosts";
import { YourPosts } from "./YourPosts";
import { PostDetail } from "./PostDetail";
import { CreatePostModal } from "@/components/posts/CreatePostModal";
import { Plus } from 'lucide-react';
import { useRightPanel } from '../../context/right-panel-context';

interface PostsProps {
  isPublicProfile?: boolean;
  onNewPostClick?: () => void;
}

export function Posts({ isPublicProfile = false }: PostsProps) {
  const searchParams = useSearchParams();
  const { selectedPostId, setSelectedPostId } = useRightPanel();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'roadmates' | 'yours'>('roadmates');
  
  const handleNewPost = () => {
    setIsCreateModalOpen(true);
  };
  
  const handleBackToFeed = () => {
    // Clear the post parameter from URL and reset selected post
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('post');
    window.history.pushState({}, '', `?${newParams.toString()}`);
    setSelectedPostId(null);
  };

  // If a post is selected, show the post detail view
  if (selectedPostId) {
    return (
      <div className="h-full flex flex-col relative">
        <div className="sticky top-0 z-10 bg-background/50 backdrop-blur-sm border-b px-4 py-2 flex items-center">
          <button 
            onClick={handleBackToFeed}
            className="text-sm flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to feed
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PostDetail />
        </div>
      </div>
    );
  }

  // Otherwise show the standard feed tabs
  return (
    <div className="h-full flex flex-col relative">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'roadmates' | 'yours')} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
          <TabsTrigger value="roadmates">Roadmates</TabsTrigger>
          <TabsTrigger 
            value="yours" 
            className="flex items-center justify-center gap-1 group"
            onClick={(e) => {
              // Only trigger the new post if clicking on the plus icon area
              const target = e.target as HTMLElement;
              if (target.closest('.new-post-trigger') || target.classList.contains('new-post-trigger')) {
                e.preventDefault();
                e.stopPropagation();
                setActiveTab('yours');
                handleNewPost();
              }
            }}
          >
            Yours
            <span 
              style={{ marginLeft: '3.75rem' }}
              className="p-0.5 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors new-post-trigger"
              role="button"
              aria-label="Create new post"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNewPost();
                }
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="roadmates" className="flex-1 overflow-y-auto">
          <RoadmatesPosts />
        </TabsContent>
        
        <TabsContent value="yours" className="flex-1 overflow-y-auto relative">
          <YourPosts isPublicProfile={isPublicProfile} onNewPostClick={handleNewPost} />
          
          {isCreateModalOpen && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-30 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl bg-background border rounded-lg shadow-lg overflow-hidden">
                <CreatePostModal 
                  isOpen={isCreateModalOpen}
                  onClose={() => setIsCreateModalOpen(false)}
                />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
