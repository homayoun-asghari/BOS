"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Post } from "@/components/posts/types/post.types";
import { useRouter } from "next/navigation";
import { useProfile } from "@/context/profile-context";
import { UserProfile } from "@/components/profile/UserProfile";
import { cn } from "@/lib/utils";
import { useRightPanel } from "./context/right-panel-context";
import { useMobileRightPanel } from "@/context/mobile-right-panel-context";

import { ChatView } from "@/components/chat/chat-view";
import { CreatePostModal } from "@/components/posts/CreatePostModal";
import { Search, X, Plus, MessageSquare, FileText } from "lucide-react";
import { dummyPosts } from "@/components/posts/dummy-posts";
import { TextDisplay } from "@/components/posts/display/TextDisplay";
import { ImageDisplay } from "@/components/posts/display/ImageDisplay";
import { VideoDisplay } from "@/components/posts/display/VideoDisplay";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home } from "./components/home";
import { Posts } from "./components/posts";


// Map dummy posts to match our Post type
const posts: Post[] = dummyPosts.map(post => ({
  id: post.id,
  type: post.type as 'text' | 'image' | 'video',
  content: post.type === 'text' ? post.content || '' : '',
  imageUrl: post.type === 'image' ? post.imageUrl || '' : '',
  videoUrl: post.type === 'video' ? post.videoUrl || '' : '',
  category: post.category || 'general',
  timestamp: post.timestamp instanceof Date ? post.timestamp : new Date(post.timestamp),
  likes: post.likes || 0,
  onLike: () => console.log('Like clicked'),
  user: {
    name: post.user.name,
    username: post.user.username || '',
    avatarUrl: post.user.avatarUrl || '',
  },
  currentRoadmap: {
    id: post.currentRoadmap.id,
    title: post.currentRoadmap.title,
  },
  currentMilestone: {
    id: post.currentMilestone.id,
    title: post.currentMilestone.title,
  },
  currentTask: {
    id: post.currentTask.id,
    title: post.currentTask.title,
  }
}));

type RightPanelViewType = 'chat' | 'posts' | 'stats' | null;

// Default view is now managed by the context

interface RightPanelProps {
  className?: string;
  children: React.ReactNode;
}

export function RightPanel({ className, children }: RightPanelProps) {
  const { currentView, openPanel, closePanel } = useRightPanel();
  const { showRightPanel, toggleRightPanel } = useMobileRightPanel();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { searchUsers, searchResults, isSearching, selectedUser, setSelectedUser } = useProfile();
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const [isMobile, setIsMobile] = useState(false);

  // Set mobile state after mount to avoid hydration mismatch
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    // Set initial value
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Use mobile state on mobile, desktop state on desktop
  const isOpen = isMobile ? showRightPanel : true;
  
  // Handle user selection from search results and start direct message
  const handleUserSelect = useCallback(async (userId: string, username: string) => {
    try {
      setSelectedUser(username);
      
      // Update URL with profile parameter
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('profile', username);
      router.replace(currentUrl.pathname + currentUrl.search);
      
      setIsSearchOpen(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error selecting user:', error);
    }
  }, [setSelectedUser, router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  // Focus the search input when search is opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearch = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setIsDropdownOpen(false);
      return;
    }
    
    try {
      // Normalize the search query (replace spaces with underscores)
      const normalizedQuery = query.replace(/\s+/g, '_');
      console.log('Searching for users with query:', { original: query, normalized: normalizedQuery });
      
      await searchUsers(normalizedQuery);
      setIsDropdownOpen(true);
    } catch (err) {
      console.error('Error searching users:', err);
      setIsDropdownOpen(false);
    }
  }, [searchQuery, searchUsers]);
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (value.trim()) {
      const timeout = setTimeout(() => {
        searchUsers(value);
        setIsDropdownOpen(true);
      }, 300);
      
      setSearchTimeout(timeout);
    } else {
      setIsDropdownOpen(false);
    }
  };
  


  const clearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchQuery('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handlePanelClose = useCallback(() => {
    // Close the panel based on device type
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      toggleRightPanel();
    } else {
      closePanel();
    }
    
    // Clear the selected user and URL immediately
    setSelectedUser(null);
    
    // Remove profile parameter from URL
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('profile');
    router.replace(currentUrl.pathname + currentUrl.search);
  }, [toggleRightPanel, closePanel, setSelectedUser, router]);

  const renderView = () => {
    // Show user profile if a user is selected
    if (selectedUser) {
      return <UserProfile onClose={handlePanelClose} />;
    }

    // Show different views based on currentView
    switch (currentView) {
      case 'chat':
        return <ChatView />;
      case 'posts':
        return <Posts />;
      case 'stats':
        return <Home />;
      default:
        return (
          <div className="h-full overflow-y-auto">
            {children}
          </div>
        );
    }
  }

  return (
    <div className={cn(
      "fixed right-0 top-0 z-40 flex h-[100dvh] border-l border-border bg-background transition-all duration-300 ease-in-out",
      // Full width on mobile, 500px on desktop
      "w-full max-w-full lg:w-[500px] lg:min-w-[500px] lg:max-w-[500px]",
      // When showing user profile, take full width but with max width
      selectedUser && "w-full max-w-full lg:mx-auto lg:max-w-[500px]",
      // Always show on large screens, controlled by mobile state on smaller screens
      "lg:fixed lg:right-0 lg:top-0 lg:bottom-0 lg:transform lg:translate-x-0",
      // Hide on small screens when not shown
      !isOpen && "max-lg:translate-x-full",
      // Ensure content is not hidden behind mobile browser UI
      "pb-[env(safe-area-inset-bottom)]",
      className
    )} style={{
      boxShadow: '-4px 0 10px rgba(0, 0, 0, 0.05)'
    }}
    onClick={() => {
      // Close dropdown when clicking anywhere in the panel
      setIsDropdownOpen(false);
    }}>
      {/* Vertical Tabs - Hide when showing user profile */}
      {!selectedUser && (
        <div className="w-10 flex-shrink-0 bg-background pt-4">
          <nav className="flex flex-col items-start space-y-4 pl-2">
            <button
              onClick={() => openPanel('stats')}
              className={`group h-24 w-10 flex items-center justify-center transform -rotate-90 origin-left whitespace-nowrap text-sm font-medium text-foreground/80 hover:text-foreground transition-colors ${
                currentView === 'stats' ? 'text-foreground' : ''
              }`}
            >
              <span className={`relative ${currentView === 'stats' ? 'after:content-[""] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-primary' : ''}`}>
                Home
              </span>
            </button>
            
            <button
              onClick={() => openPanel('posts')}
              className={`group h-24 w-10 flex items-center justify-center transform -rotate-90 origin-left whitespace-nowrap text-sm font-medium text-foreground/80 hover:text-foreground transition-colors ${
                currentView === 'posts' ? 'text-foreground' : ''
              }`}
            >
              <span className={`relative ${currentView === 'posts' ? 'after:content-[""] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-primary' : ''}`}>
                Posts
              </span>
            </button>
            
            <button
              onClick={() => openPanel('chat')}
              className={`group h-24 w-10 flex items-center justify-center transform -rotate-90 origin-left whitespace-nowrap text-sm font-medium text-foreground/80 hover:text-foreground transition-colors ${
                currentView === 'chat' ? 'text-foreground' : ''
              }`}
            >
              <span className={`relative ${currentView === 'chat' ? 'after:content-[""] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-primary' : ''}`}>
                Messages
              </span>
            </button>
          </nav>
        </div>
      )}
      
      {/* Content Area - Allow vertical scrolling with proper spacing */}
      <div className={cn(
        "flex-1 flex flex-col h-full overflow-y-auto relative",
        selectedUser && "w-full"
      )} style={{
        // Ensure smooth scrolling on iOS
        WebkitOverflowScrolling: 'touch',
        // Add extra bottom padding to ensure all content is reachable
        // Includes safe area insets for mobile browsers
        paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 2rem))'
      }}>
        {/* Search and Action Buttons - Hidden when viewing user profile */}
        {!selectedUser && (
          <div className="absolute right-4 top-4 z-10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(!isDropdownOpen);
                  }}
                  className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute right-4 top-12 z-20 w-48 rounded-md bg-background shadow-lg border border-border"
          >
            <button 
              onClick={() => {
                setIsDropdownOpen(false);
                setIsPostModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>New Post</span>
            </button>
            <button 
              onClick={() => {
                setIsDropdownOpen(false);
                // Handle new message
                console.log('New message');
              }}
              className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              <span>New Message</span>
            </button>
          </div>
        )}
        
        {/* Search Overlay */}
        {isSearchOpen && (
          <div className="absolute inset-0 z-20 backdrop-blur-sm bg-background/80 flex items-start justify-end p-4">
            <div className="w-full max-w-md relative">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search for users..."
                  className="w-full rounded-lg border border-border bg-background/95 py-3 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-lg"
                  autoFocus
                />
                {(isSearching || searchResults.length > 0) && (
                  <div className="absolute z-50 mt-1 w-full rounded-md bg-background shadow-lg border border-border max-h-60 overflow-auto">
                    {isSearching ? (
                      <div className="p-2 text-sm text-muted-foreground">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleUserSelect(user.id, user.username)}
                          className="flex w-full items-center gap-2 p-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                            <AvatarFallback>
                              {user.username?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            {user.display_name && (
                              <p className="font-medium text-sm truncate">{user.display_name}</p>
                            )}
                            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">No users found</div>
                    )}
                  </div>
                )}
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground px-2 py-1 text-sm"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        )}
        
        {/* Main Content */}
        <div className="h-full overflow-hidden">
          {renderView()}
        </div>
      </div>
      
      {/* Create Post Modal */}
      <CreatePostModal 
        isOpen={isPostModalOpen} 
        onClose={() => setIsPostModalOpen(false)}
        onPostCreated={(postData) => {
          console.log('New post created:', postData);
          // Handle the post submission (e.g., upload to server, update state, etc.)
        }}
      />
    </div>
  );
}

interface RightPanelViewProps {
  view: RightPanelViewType;
  children: React.ReactNode;
}

export function RightPanelView({ view, children }: RightPanelViewProps) {
  const { currentView } = useRightPanel();

  if (currentView !== view) return null;

  return <>{children}</>;
}

// Utility hook to control the right panel
export function useRightPanelControls() {
  const { openPanel, currentView } = useRightPanel();

  return {
    openPanel,
    currentView,
  };
}
