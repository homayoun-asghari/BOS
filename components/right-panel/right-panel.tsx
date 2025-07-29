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
import { Search, X } from "lucide-react";
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

type RightPanelViewType = 'messages' | 'posts' | 'stats' | null;

// Default view is now managed by the context

interface RightPanelProps {
  className?: string;
  children?: React.ReactNode;
}

export function RightPanel({ className, children }: RightPanelProps = {}) {
  const { currentView, openPanel, closePanel } = useRightPanel();
  const { showRightPanel, toggleRightPanel } = useMobileRightPanel();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Toggle collapse state and close any open modals
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  // Search is now a regular tab, no need for separate state
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const { searchUsers, searchResults, isSearching, selectedUser, setSelectedUser } = useProfile();
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const [isMobile, setIsMobile] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [panelWidth, setPanelWidth] = useState(500);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Set mobile state after mount to avoid hydration mismatch
  useEffect(() => {
    const checkIfMobile = () => {
      const isMobileView = window.innerWidth < 1024;
      setIsMobile(isMobileView);
      
      // Reset panel width when switching to mobile
      if (isMobileView) {
        setPanelWidth(500);
      }
    };
    
    // Set initial value
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Use mobile state on mobile, always open on desktop (handled by isCollapsed)
  
  // Handle user selection from search results and start direct message
  const handleUserSelect = useCallback(async (userId: string, username: string) => {
    try {
      setSelectedUser(username);
      
      // Update URL with profile parameter
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('profile', username);
      router.replace(currentUrl.pathname + currentUrl.search);
      
      // User profile is shown, search tab is closed automatically
      setSearchQuery('');
    } catch (error) {
      console.error('Error selecting user:', error);
    }
  }, [setSelectedUser, router]);

  // Focus the search input when search tab is opened
  useEffect(() => {
    if (currentView === 'search' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [currentView]);

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
      }, 300);
      
      setSearchTimeout(timeout);
    } else {
      // Clear search results when input is empty
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
      case 'messages':
        return <ChatView onActiveConversationChange={setIsChatActive} />;
      case 'posts':
        return <Posts onNewPostClick={() => {}} />;
      case 'stats':
        return <Home />;
      case 'search':
        return (
          <div className="h-full overflow-y-auto bg-background flex flex-col">
            <div className="w-full p-4">
              <form onSubmit={handleSearch} className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search for users..."
                  className="w-full rounded-lg border border-border bg-background/95 py-3 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                  autoFocus
                />
                {(isSearching || searchResults.length > 0) && (
                  <div className="absolute left-0 right-0 z-50 mt-1 bg-background shadow-lg border-x border-b border-border max-h-[calc(100vh-120px)] overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 text-sm text-muted-foreground">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleUserSelect(user.id, user.username)}
                          className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent hover:text-accent-foreground transition-colors border-t border-border first:border-t-0"
                        >
                          <Avatar className="h-10 w-10">
                            {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                            <AvatarFallback>
                              {user.username?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <p className="text-sm font-medium text-foreground truncate">
                              {user.display_name || user.username}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              @{user.username}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground">No users found</div>
                    )}
                  </div>
                )}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground px-2 py-1 text-sm"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </form>
            </div>
            
            {!searchQuery && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">Search for users to connect with</p>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="h-full overflow-y-auto">
            {children}
          </div>
        );
    }
  }

  // Handle mouse move for resizing
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    // Calculate new width (subtract from right edge of screen)
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 400; // Minimum width
    const maxWidth = window.innerWidth * 0.8; // Maximum 80% of viewport width
    
    // Clamp the width between min and max
    const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
    setPanelWidth(clampedWidth);
  }, [isResizing]);
  
  // Handle mouse up to stop resizing
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.style.pointerEvents = '';
  }, []);
  
  // Add/remove event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);
  
  // Expose panel width via CSS variable so pages can respond
  useEffect(() => {
    let width = 0;
    if (isMobile) {
      width = showRightPanel ? window.innerWidth : 0;
    } else {
      width = isCollapsed ? 48 : panelWidth; // 12 tailwind => 3rem => 48px
    }
    document.documentElement.style.setProperty('--right-panel-width', `${width}px`);
  }, [isMobile, showRightPanel, isCollapsed, panelWidth]);

  // Handle window resize to ensure panel doesn't go off screen
  useEffect(() => {
    const handleWindowResize = () => {
      if (panelWidth > window.innerWidth * 0.8) {
        setPanelWidth(window.innerWidth * 0.8);
      }
    };
    
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [panelWidth]);

  return (
    <div 
      className={cn(
        "fixed right-0 top-0 z-40 flex h-[100dvh] border-l border-border bg-background transition-all duration-300 ease-in-out",
        // Full width on mobile, custom width on desktop
        isMobile 
          ? (showRightPanel ? 'w-full' : 'w-0') 
          : (isCollapsed ? 'w-12' : ''),
        // When showing user profile, take full width but with max width
        
        // Hide on small screens when not shown
        isMobile && !showRightPanel && "translate-x-full",
        // Ensure content is not hidden behind mobile browser UI
        "pb-[env(safe-area-inset-bottom)]",
        className
      )} 
      style={{
        boxShadow: '-4px 0 10px rgba(0, 0, 0, 0.05)',
        // Apply dynamic width when not on mobile and not collapsed
        ...(!isMobile && !isCollapsed && { width: `${panelWidth}px` }),
        // Ensure smooth transitions
        transition: isResizing ? 'none' : 'width 0.2s ease-out, transform 0.3s ease-out'
      }}
    >
      {/* Resize Handle - Only show on desktop when not collapsed */}
      {!isMobile && !isCollapsed && (
        <div 
          ref={resizeRef}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50 active:bg-primary transition-colors z-20"
          onMouseDown={() => setIsResizing(true)}
        />
      )}
      
      {/* Collapse/Expand Button - Only show on desktop */}
      {!isMobile && (
        <button
          onClick={toggleCollapse}
          className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-16 bg-background border border-r-0 border-border rounded-l-lg flex items-center justify-center hover:bg-accent transition-colors z-10"
          aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {isCollapsed ? '>' : '<'}
        </button>
      )}
      {/* Vertical Tabs - Hide when showing user profile */}
      {!selectedUser && (currentView !== 'messages' || !isChatActive) && (
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
              onClick={() => openPanel('messages')}
              className={`group h-24 w-10 flex items-center justify-center transform -rotate-90 origin-left whitespace-nowrap text-sm font-medium text-foreground/80 hover:text-foreground transition-colors ${
                currentView === 'messages' ? 'text-foreground' : ''
              }`}
            >
              <span className={`relative ${currentView === 'messages' ? 'after:content-[""] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-primary' : ''}`}>
                Messages
              </span>
            </button>
            
            <button
              onClick={() => openPanel('search')}
              className={`group h-24 w-10 flex items-center justify-center transform -rotate-90 origin-left whitespace-nowrap text-sm font-medium text-foreground/80 hover:text-foreground transition-colors ${
                currentView === 'search' ? 'text-foreground' : ''
              }`}
            >
              <span className={`relative ${currentView === 'search' ? 'after:content-[""] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-primary' : ''}`}>
                Search
              </span>
            </button>
          </nav>
        </div>
      )}
      
      {/* Content Area - Allow vertical scrolling with proper spacing */}
      <div className={cn(
         `${selectedUser || (currentView === 'messages' && isChatActive) ? '' : 'flex-1'} flex flex-col h-full overflow-y-auto relative`,
        
      )} style={{
        // Ensure smooth scrolling on iOS
        WebkitOverflowScrolling: 'touch',
        // Add extra bottom padding to ensure all content is reachable
        // Includes safe area insets for mobile browsers
        paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 2rem))'
      }}>


        {/* Dropdown Menu removed - no longer needed with search as a tab */}
        
        {/* Search has been moved to a regular tab */}
        
        {/* Main Content */}
        <div className="h-full overflow-hidden">
          {!isCollapsed && renderView()}
        </div>
      </div>
      

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
