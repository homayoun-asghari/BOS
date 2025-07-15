"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useRightPanel } from "./context/right-panel-context";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMobileRightPanel } from "@/context/mobile-right-panel-context";
import { ChatView } from "@/components/chat/chat-view";
import { Search, X, Plus, MessageSquare, FileText } from "lucide-react";
import { CreatePostModal } from "@/components/posts/CreatePostModal";

type RightPanelViewType = 'chat' | 'posts' | 'stats';

interface RightPanelProps {
  className?: string;
  children: React.ReactNode;
}

export function RightPanel({ className, children }: RightPanelProps) {
  const { showRightPanel } = useMobileRightPanel();
  const { currentView, openPanel } = useRightPanel();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isInActiveChat, setIsInActiveChat] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fabRef = useRef<HTMLDivElement>(null);

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
  // Using useAuth to ensure auth state is properly initialized
  useAuth();

  // Focus the search input when search is opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle search logic here
    console.log('Searching for:', searchQuery);
    // Close search after submitting (or keep it open for multiple searches)
    // setIsSearchOpen(false);
  };

  const clearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchQuery('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const renderView = () => {
    // If we're in stats view, show the stats content
    if (currentView === 'stats') {
      return (
        <div className="h-full overflow-y-auto p-4">
          {children}
        </div>
      );
    }
    
    // For chat view
    if (currentView === 'chat') {
      return (
        <ChatView 
          className="h-full" 
          onActiveConversationChange={(isActive) => setIsInActiveChat(isActive)}
        />
      );
    }
    
    // For posts view
    if (currentView === 'posts') {
      return (
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      );
    }
    
    // Default view (messages)
    return (
      <div className="h-full overflow-y-auto">
        {children}
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed right-0 top-0 z-40 flex h-screen border-l border-border bg-background transition-transform duration-300 ease-in-out",
      "w-[500px] min-w-[500px] max-w-[500px]",
      // Always show on large screens, controlled by mobile state on smaller screens
      "lg:fixed lg:right-0 lg:top-0 lg:bottom-0 lg:transform lg:translate-x-0",
      // Hide on small screens when not shown
      !showRightPanel && "max-lg:translate-x-full",
      className
    )} style={{
      boxShadow: '-4px 0 10px rgba(0, 0, 0, 0.05)'
    }}>
      {/* Vertical Tabs */}
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
      
      {/* Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* FAB - Hidden in active chat but shown in conversation list */}
        {(currentView !== 'chat' || !isInActiveChat) && (
          <div ref={fabRef} className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
            {/* FAB Options */}
            <div className={`flex flex-col items-end gap-3 transition-all duration-200 ${isFabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
              <button 
                onClick={() => {
                  setIsFabOpen(false);
                  // Handle new message
                  console.log('New message');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                <span>New Message</span>
              </button>
              <button 
                onClick={() => {
                  setIsFabOpen(false);
                  setIsPostModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-full shadow-lg hover:bg-foreground/90 transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>New Post</span>
              </button>
            </div>
            
            {/* Main FAB Button */}
            <button
              onClick={() => setIsFabOpen(!isFabOpen)}
              className={`flex items-center justify-center w-14 h-14 rounded-full ${isFabOpen ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'} shadow-lg transition-all duration-200`}
              aria-label="Create new"
            >
              <Plus className={`h-6 w-6 transition-transform duration-200 ${isFabOpen ? 'rotate-45' : ''}`} />
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
        onSubmit={(post) => {
          console.log('New post created:', post);
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
