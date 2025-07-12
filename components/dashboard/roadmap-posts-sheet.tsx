'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PostCard } from '@/components/ui/post-card';
import { v4 as uuidv4 } from 'uuid';

interface Post {
  id: string;
  content: string;
  created_at: string | Date;
  user: {
    name: string;
    avatar_url: string;
  };
  currentRoadmap: {
    id: string;
    title: string;
  };
  currentMilestone: {
    id: string;
    title: string;
  };
  currentTask: {
    id: string;
    title: string;
  };
  likes: number;
  comments: number;
}

export function RoadmapPostsSheet() {
  // Generate sample posts with useCallback to prevent recreation on each render
  const generateSamplePosts = useCallback(async (): Promise<Post[]> => {
    // Sample data inside useCallback to avoid dependency issues
    const sampleUsers = [
      { id: '1', name: 'Alex Johnson', avatar: '/avatars/alex.jpg' },
      { id: '2', name: 'Taylor Swift', avatar: '/avatars/taylor.jpg' },
      { id: '3', name: 'Jamie Smith', avatar: '/avatars/jamie.jpg' },
      { id: '4', name: 'Morgan Lee', avatar: '/avatars/morgan.jpg' },
      { id: '5', name: 'Casey Kim', avatar: '/avatars/casey.jpg' },
    ];

    const sampleRoadmaps = [
      { id: 'rm1', title: 'Q3 2023 Product Launch' },
      { id: 'rm2', title: 'Mobile App Redesign' },
      { id: 'rm3', title: 'API V2 Development' },
    ];

    const sampleMilestones = [
      { id: 'ms1', title: 'User Authentication' },
      { id: 'ms2', title: 'Dashboard UI/UX' },
      { id: 'ms3', title: 'API Integration' },
      { id: 'ms4', title: 'Performance Optimization' },
    ];

    const sampleTasks = [
      { id: 'task1', title: 'Implement OAuth 2.0' },
      { id: 'task2', title: 'Design Dark Mode' },
      { id: 'task3', title: 'Create API Documentation' },
      { id: 'task4', title: 'Database Schema Design' },
      { id: 'task5', title: 'Write Unit Tests' },
    ];

    const samplePosts = [
      'Just completed the authentication flow for our new feature!',
      'Found an interesting bug in the API that was causing performance issues.',
      'Working on the new dashboard design. What do you think about the new layout?',
      'Successfully deployed the latest update to production! 🚀',
      'Need help with implementing WebSockets for real-time updates.',
      'Our team just hit 1,000 commits on this project! 🎉',
      'Writing documentation for the new API endpoints.',
      'Fixed a critical security issue in the login flow.',
      'Just finished the onboarding flow for new users.',
      'Performance optimizations complete - pages load 2x faster now!',
    ];

    const posts: Post[] = [];
    const now = new Date();
    
    for (let i = 0; i < 10; i++) {
      const user = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
      const roadmap = sampleRoadmaps[Math.floor(Math.random() * sampleRoadmaps.length)];
      const milestone = sampleMilestones[Math.floor(Math.random() * sampleMilestones.length)];
      const task = sampleTasks[Math.floor(Math.random() * sampleTasks.length)];
      const timestamp = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      
      posts.push({
        id: uuidv4(),
        content: samplePosts[i],
        created_at: timestamp.toISOString(),
        user: {
          name: user.name,
          avatar_url: user.avatar,
        },
        currentRoadmap: roadmap,
        currentMilestone: milestone,
        currentTask: task,
        likes: Math.floor(Math.random() * 50),
        comments: Math.floor(Math.random() * 10),
      });
    }
    
    return Promise.resolve(posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  }, []);

  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const lastScrollY = useRef(0);
  const MIN_HEIGHT = 48;
  const EXPANDED_HEIGHT = 600; // Increased to fit more content
  const [currentHeight, setCurrentHeight] = useState(MIN_HEIGHT);
  
  // Generate posts on initial render only
  useEffect(() => {
    const loadPosts = async () => {
      const generatedPosts = await generateSamplePosts();
      setPosts(generatedPosts);
    };
    loadPosts();
  }, [generateSamplePosts]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setCurrentHeight(EXPANDED_HEIGHT);
        setIsExpanded(true);
      } else if (currentScrollY < lastScrollY.current) {
        setCurrentHeight(MIN_HEIGHT);
        setIsExpanded(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setCurrentHeight(MIN_HEIGHT);
  }, []);

  const handleSendPost = () => {
    if (!newPost.trim()) return;
    const newPostObj: Post = {
      id: Date.now().toString(),
      content: newPost,
      created_at: new Date().toISOString(),
      user: { 
        name: 'Current User', 
        avatar_url: '/avatars/default.jpg' 
      },
      currentRoadmap: {
        id: 'rm-current',
        title: 'Current Roadmap'
      },
      currentMilestone: {
        id: 'ms-current',
        title: 'Current Milestone'
      },
      currentTask: {
        id: 'task-current',
        title: 'Current Task'
      },
      likes: 0,
      comments: 0
    };
    setPosts([newPostObj, ...posts]);
    setNewPost('');
    setCurrentHeight(EXPANDED_HEIGHT);
    setIsExpanded(true);
  };

  const sheetStyle = {
    height: `${currentHeight}px`,
    transition: 'height 0.3s cubic-bezier(0.2, 0, 0.2, 1)',
  };

  const contentOpacity = Math.min(1, (currentHeight - MIN_HEIGHT) / 100);
  const contentScale = 0.9 + (0.1 * Math.min(1, currentHeight / EXPANDED_HEIGHT));

  return (
    <AnimatePresence>
      <motion.div
        ref={sheetRef}
        className={cn(
          'fixed bottom-0 left-[6rem] right-[375px] z-[9999]', // Default layout
          'max-[1023px]:left-0 max-[1023px]:right-0', // Full width at 1023px and below
          'bg-background/95 backdrop-blur-lg border-t border-border/50 shadow-2xl',
          'rounded-t-2xl overflow-hidden transition-all duration-300',
          'transform-gpu'
        )}
        style={{
          ...sheetStyle,
          willChange: 'transform, height',
        }}
        initial={{ height: MIN_HEIGHT }}
        animate={{
          height: currentHeight,
          transition: {
            type: 'spring',
            damping: 30,
            stiffness: 300,
          },
        }}
      >
        <div 
          className="px-4 py-2 border-b border-border/50 cursor-pointer"
          onClick={() => {
            setIsExpanded(!isExpanded);
            setCurrentHeight(isExpanded ? MIN_HEIGHT : EXPANDED_HEIGHT);
          }}
        >
          <div className="flex justify-center pt-1 pb-1.5">
            <div className="w-8 h-1 bg-muted-foreground/20 rounded-full" />
          </div>
          <h3 className="font-medium text-sm flex items-center gap-2 mt-1">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Posts</span>
          </h3>
        </div>

        <motion.div
          className="h-[calc(100%-56px)] flex flex-col"
          style={{
            opacity: contentOpacity,
            scale: contentScale,
            transformOrigin: 'top',
          }}
          animate={{
            opacity: isExpanded ? 1 : 0,
            scale: isExpanded ? 1 : 0.95,
            transition: {
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
            },
          }}
        >
          {/* Input Area */}
          <div className="border-b border-border/50 p-4">
            <div className="relative">
              <Textarea
                placeholder="What did you experience?"
                className="min-h-[80px] resize-none pr-12"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newPost.trim()) handleSendPost();
                  }
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 bottom-2 h-8 w-8 rounded-full transition-colors"
                disabled={!newPost.trim()}
                onClick={handleSendPost}
              >
                <Send className={`h-4 w-4 transition-transform ${!newPost.trim() ? 'text-muted-foreground' : 'text-primary'}`} />
              </Button>
            </div>
          </div>

          {/* Posts List */}
          <ScrollArea className="flex-1 px-4 py-2">
            <div className="space-y-4 py-2">
              <div className="space-y-4">
                {posts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PostCard
                      id={post.id}
                      user={{
                        name: post.user.name,
                        avatarUrl: post.user.avatar_url,
                      }}
                      content={post.content}
                      timestamp={post.created_at}
                      currentRoadmap={post.currentRoadmap}
                      currentMilestone={post.currentMilestone}
                      currentTask={post.currentTask}
                      likes={Math.floor(Math.random() * 50)}
                      comments={Math.floor(Math.random() * 10)}
                      onLike={(postId) => {
                        // Handle like
                        console.log(`Liked post ${postId}`);
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
