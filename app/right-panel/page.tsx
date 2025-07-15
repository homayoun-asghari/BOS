"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ChatView } from "@/components/chat/chat-view";
import { Search, X, Plus, MessageSquare, FileText } from "lucide-react";
import { CreatePostModal } from "@/components/posts/CreatePostModal";

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
        router.replace("/dashboard");
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
  const [currentView, setCurrentView] = useState<RightPanelViewType>('stats');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isInActiveChat, setIsInActiveChat] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fabRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useResponsiveNavigation();
  useAuth();

  // Close FAB when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsFabOpen(false);
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
    
    if (currentView === 'chat') {
      return (
        <ChatView 
          className="h-full" 
          onActiveConversationChange={(isActive) => setIsInActiveChat(isActive)}
        />
      );
    }
    
    if (currentView === 'posts') {
      return (
        <div className="h-full overflow-y-auto p-4">
          <h2 className="text-2xl font-bold mb-4">Posts</h2>
          <p>Your posts will appear here.</p>
        </div>
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
        {/* FAB - Hidden in active chat but shown in conversation list */}
        {(currentView !== 'chat' || !isInActiveChat) && (
          <div ref={fabRef} className="fixed bottom-6 right-4 z-30 flex flex-col items-end gap-2">
            {/* FAB Options */}
            <div className={`flex flex-col items-end gap-2 transition-all duration-200 ${isFabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
              <button 
                onClick={() => {
                  setIsFabOpen(false);
                  setCurrentView('chat');
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>New Message</span>
              </button>
              <button 
                onClick={() => {
                  setIsFabOpen(false);
                  setIsPostModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-foreground text-background rounded-full shadow-lg hover:bg-foreground/90 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>New Post</span>
              </button>
            </div>
            
            {/* Main FAB Button */}
            <button
              onClick={() => setIsFabOpen(!isFabOpen)}
              className={`flex items-center justify-center w-12 h-12 rounded-full ${isFabOpen ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'} shadow-lg transition-all duration-200`}
              aria-label="Create new"
            >
              <Plus className={`h-5 w-5 transition-transform duration-200 ${isFabOpen ? 'rotate-45' : ''}`} />
            </button>
          </div>
        )}
        
        {/* Search Toggle Button */}
        <div className="absolute right-4 top-4 z-10">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>
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
                  autoFocus
                />
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
                  Esc
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
