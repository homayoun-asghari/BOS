"use client";

import { cn } from "@/lib/utils";
import { useRightPanel } from "./context/right-panel-context";
import { useUser } from "@/hooks/useUser";
import { useState } from "react";
import { Search, MessageSquare, FileText, ArrowLeft } from "lucide-react";
import { useMobileRightPanel } from "@/context/mobile-right-panel-context";
import { ChatView } from "@/components/chat/chat-view";

type RightPanelViewType = 'chat' | 'posts' | 'stats';

interface RightPanelProps {
  className?: string;
  children: React.ReactNode;
}

export function RightPanel({ className, children }: RightPanelProps) {
  const { showRightPanel } = useMobileRightPanel();
  const { currentView, openPanel } = useRightPanel();
  useUser(); // We don't need the user object directly, but we want to keep the hook call
  const [showMessages, setShowMessages] = useState(false);
  const [showPosts, setShowPosts] = useState(false);

  const renderView = () => {
    // If we're in stats view, show the stats content
    if (currentView === 'stats') {
      return (
        <div className="h-full flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="p-4 overflow-y-auto">
            {children}
          </div>
        </div>
      );
    }
    
    // For chat view
    if (currentView === 'chat') {
      return <ChatView className="h-full" />;
    }
    
    // For posts view
    if (currentView === 'posts') {
      return (
        <div className="h-full flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Posts</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      );
    }
    
    // Default view (messages)
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search messages..."
              className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed right-0 top-0 z-40 flex h-screen flex-col border-l border-border bg-background transition-transform duration-300 ease-in-out",
      "w-[500px] min-w-[500px] max-w-[500px]",
      // Always show on large screens, controlled by mobile state on smaller screens
      "lg:fixed lg:right-0 lg:top-0 lg:bottom-0 lg:transform lg:translate-x-0",
      // Hide on small screens when not shown
      !showRightPanel && "max-lg:translate-x-full",
      className
    )} style={{
      boxShadow: '-4px 0 10px rgba(0, 0, 0, 0.05)'
    }}>
      <div className="flex flex-col h-full w-full bg-background/95 backdrop-blur-sm border-l border-border">
        <div className="flex-1 overflow-hidden">
          {renderView()}
        </div>

        {/* Bottom navigation */}
        <div className="px-4 py-2 bg-background/95 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-3">
            <button
              className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg ${
                showMessages
                  ? "bg-primary/90 text-primary-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              } transition-colors`}
              onClick={() => {
                if (showMessages) {
                  // If already showing messages, go back to stats
                  openPanel('stats');
                  setShowMessages(false);
                } else {
                  // If not showing messages, go to chat
                  openPanel('chat');
                  setShowMessages(true);
                  setShowPosts(false);
                }
              }}
            >
              {showMessages ? (
                <ArrowLeft className="h-4 w-4" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              {showMessages ? 'Back' : 'Messages'}
            </button>
            <button
              className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg ${
                showPosts
                  ? "bg-primary/90 text-primary-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              } transition-colors`}
              onClick={() => {
                if (showPosts) {
                  // If already showing posts, go back to stats
                  openPanel('stats');
                  setShowPosts(false);
                } else {
                  // If not showing posts, go to posts
                  openPanel('posts');
                  setShowPosts(true);
                  setShowMessages(false);
                }
              }}
            >
              {showPosts ? (
                <ArrowLeft className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {showPosts ? 'Back' : 'Posts'}
            </button>
          </div>
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
