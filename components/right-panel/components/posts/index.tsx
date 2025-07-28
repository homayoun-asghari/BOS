'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoadmatesPosts } from "./RoadmatesPosts";
import { YourPosts } from "./YourPosts";
import { CreatePostModal } from "@/components/posts/CreatePostModal";
import { Plus } from 'lucide-react';

interface PostsProps {
  isPublicProfile?: boolean;
  onNewPostClick?: () => void;
}

export function Posts({ isPublicProfile = false }: PostsProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const handleNewPost = () => {
    setIsCreateModalOpen(true);
  };
  
  const handlePostSubmit = (post: { type: string; content: string | File | null }) => {
    console.log('New post created:', post);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="h-full flex flex-col relative">
      <Tabs defaultValue="roadmates" className="h-full flex flex-col">
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
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl bg-background border rounded-lg shadow-lg overflow-hidden">
                <CreatePostModal 
                  isOpen={isCreateModalOpen}
                  onClose={() => setIsCreateModalOpen(false)}
                  type="text"
                  content={null}
                />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
