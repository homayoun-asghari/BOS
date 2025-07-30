"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ChatView } from "@/components/chat/chat-view";
import { Search, X, Plus } from "lucide-react";

import { CreatePostModal } from "@/components/posts/CreatePostModal";
import { dummyPosts } from "@/components/posts/dummy-posts";
import { TextDisplay } from "@/components/posts/display/TextDisplay";
import { ImageDisplay } from "@/components/posts/display/ImageDisplay";
import { VideoDisplay } from "@/components/posts/display/VideoDisplay";

type RightPanelViewType = 'chat' | 'posts' | 'stats';

// Custom hook to handle responsive behavior
function useResponsiveNavigation() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const isMobileView = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(isMobileView);

      // If screen is lg or larger and we're on the right panel page, redirect to dashboard
      if (!isMobileView && window.location.pathname === "/right-panel") {
        router.replace("/roadmap");
      }
    };

    // Initial check
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener("resize", checkScreenSize);

    // Clean up
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [router]);

  return { isMobile };
}

function RightPanelContent() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<RightPanelViewType>('posts');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useResponsiveNavigation();
  useAuth();

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
  }, []);



  // Focus the search input when search is opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
  };

  const clearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchQuery('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const renderView = () => {
    if (currentView === 'stats') {
      return (
        <div className="h-full overflow-y-auto p-4">
          <h2 className="text-2xl font-bold mb-4">Home</h2>
          <p>Welcome to your dashboard. Select a view from the sidebar.</p>
        </div>
      );
    }

    if (currentView === 'posts') {
      return (
        <div className="h-full overflow-y-auto p-4 space-y-4">
          {dummyPosts.map((post) => {
            const timestamp = post.timestamp instanceof Date ? post.timestamp : new Date(post.timestamp);
            switch (post.type) {
              case 'text':
                return (
                  <div key={post.id} className="rounded-2xl">
                    <TextDisplay
                      id={post.id}
                      content={post.content}
                      timestamp={timestamp}
                      user={post.user}
                      currentRoadmap={post.currentRoadmap}
                      currentMilestone={post.currentMilestone}
                      currentTask={post.currentTask}
                      likes={post.likes}
                      onLike={() => console.log('Like clicked')}
                    />
                  </div>
                );
              case 'image':
                return (
                  <div key={post.id} className="rounded-2xl">
                    <ImageDisplay
                      id={post.id}
                      imageUrl={post.imageUrl}
                      timestamp={timestamp}
                      user={post.user}
                      currentRoadmap={post.currentRoadmap}
                      currentMilestone={post.currentMilestone}
                      currentTask={post.currentTask}
                      likes={post.likes}
                      onLike={() => console.log('Like clicked')}
                    />
                  </div>
                );
              case 'video':
                return (
                  <div key={post.id} className="rounded-2xl">
                    <VideoDisplay
                      id={post.id}
                      videoUrl={post.videoUrl}
                      timestamp={timestamp}
                      user={post.user}
                      currentRoadmap={post.currentRoadmap}
                      currentMilestone={post.currentMilestone}
                      currentTask={post.currentTask}
                      likes={post.likes}
                      onLike={() => console.log('Like clicked')}
                    />
                  </div>
                );
              default:
                return null;
            }
          })}
          {/* End of posts indicator */}
          <div className="h-64 flex items-center justify-center bg-background/50 border-t border-border/20">
            <p className="text-muted-foreground text-sm">You've reached the end of the posts</p>
          </div>
        </div>
      );
    }
    
    if (currentView === 'chat') {
      return (
        <ChatView 
          className="h-full" 

        />
      );
    }
    
    return null;
  };

  // Close the panel when pressing the back button on mobile
  useEffect(() => {
    if (!isMobile) return;
    
    const handleBack = () => {
      router.back();
    };

    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, [isMobile, router]);

  return (
    <div className="fixed inset-0 z-40 flex h-screen w-screen bg-background transition-transform duration-300 ease-in-out">
      {/* Vertical Tabs */}
      <div className="w-10 flex-shrink-0 bg-background pt-4">
        <nav className="flex flex-col items-start space-y-4 pl-2">
          <button
            onClick={() => setCurrentView('stats')}
            className={`group h-24 w-10 flex items-center justify-center transform -rotate-90 origin-left whitespace-nowrap text-sm font-medium text-foreground/80 hover:text-foreground transition-colors ${
              currentView === 'stats' ? 'text-foreground' : ''
            }`}
          >
            <span className={`relative ${currentView === 'stats' ? 'after:content-[""] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-primary' : ''}`}>
              Home
            </span>
          </button>
          
          <button
            onClick={() => setCurrentView('posts')}
            className={`group h-24 w-10 flex items-center justify-center transform -rotate-90 origin-left whitespace-nowrap text-sm font-medium text-foreground/80 hover:text-foreground transition-colors ${
              currentView === 'posts' ? 'text-foreground' : ''
            }`}
          >
            <span className={`relative ${currentView === 'posts' ? 'after:content-[""] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-primary' : ''}`}>
              Posts
            </span>
          </button>
          
          <button
            onClick={() => setCurrentView('chat')}
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
      
      {/* Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">

        
        {/* Search Toggle Button */}
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
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Create new"
              >
                <Plus className="h-4 w-4" />
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-background rounded-lg shadow-lg py-1 z-50 border border-border">
                  <button
                    onClick={() => {
                  setIsPostModalOpen(true);
                  setIsDropdownOpen(false);
                }}
                    className="w-full px-3 py-2 text-left hover:bg-accent/50 text-sm"
                  >
                    New Post
                  </button>
                  <button
                    onClick={() => {
                  setCurrentView('chat');
                  setIsDropdownOpen(false);
                }}
                    className="w-full px-3 py-2 text-left hover:bg-accent/50 text-sm"
                  >
                    New Message
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded-lg border border-border bg-background/95 py-3 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-lg"
                  style={{
                    // Prevent zooming
                    WebkitTextSizeAdjust: '100%',
                    textZoom: '100%',
                    zoom: 1,
                    
                    // Prevent keyboard zoom
                    WebkitKeyboardDisplay: 'compact',
                    WebkitTextSizeAdjust: 'none',
                    
                    // Prevent form zoom
                    resize: 'none',
                    overflow: 'hidden',
                    
                    // Prevent focus zoom
                    outline: 'none',
                    outlineWidth: 0,
                    outlineStyle: 'none',
                    outlineColor: 'transparent',
                    
                    // Prevent transform zoom
                    WebkitTransform: 'none',
                    transform: 'none',
                    transformOrigin: '0 0',
                    
                    // Additional zoom prevention
                    WebkitZoom: 1,
                    MozZoom: 1,
                    msZoom: 1,
                    OZoom: 1,
                    
                    // Prevent scaling
                    WebkitTransform: 'scale(1)',
                    MozTransform: 'scale(1)',
                    msTransform: 'scale(1)',
                    OTransform: 'scale(1)',
                    
                    // Prevent keyboard scaling
                    WebkitKeyboardDisplay: 'compact',
                    WebkitTextSizeAdjust: 'none',
                    
                    // Prevent input scaling
                    WebkitAppearance: 'textfield',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    
                    // Prevent tap highlight color
                    WebkitTapHighlightColor: 'transparent',
                    
                    // Prevent user select
                    WebkitUserSelect: 'text',
                    userSelect: 'text',
                    
                    // Prevent modify
                    WebkitUserModify: 'read-write-plaintext-only',
                    
                    // Prevent touch callout
                    WebkitTouchCallout: 'none',
                    
                    // Prevent overflow scrolling
                    WebkitOverflowScrolling: 'touch',
                    
                    // Force hardware acceleration
                    WebkitTransform: 'translateZ(0)',
                    WebkitBackfaceVisibility: 'hidden',
                    WebkitPerspective: '1000',
                  }}
                  autoFocus
                />
                {searchQuery ? (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Close search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
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
        onSubmit={(postData) => {
          console.log('New post created:', postData);
          setIsPostModalOpen(false);
        }}
      />
    </div>
  );
}

export default function RightPanelPage() {
  return <RightPanelContent />;
}
