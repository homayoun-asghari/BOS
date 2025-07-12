'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MessageSquare, AlertCircle } from 'lucide-react';

// Custom hook to handle responsive behavior
function useResponsiveNavigation() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const isMobileView = window.innerWidth < 1023; // md breakpoint
      setIsMobile(isMobileView);
      
      // If screen is md or larger and we're on the right panel page, redirect to dashboard
      if (!isMobileView && window.location.pathname === '/right-panel') {
        router.replace('/dashboard');
      }
    };

    // Initial check
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);

    // Clean up
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [router]);

  return { isMobile };
}
import { ChatView } from '@/components/right-panel/components/chat-view';
import { PostsView } from '@/components/right-panel/components/posts-view';
import { StatsView } from '@/components/right-panel/components/stats-view';
import { RightPanelProvider } from '@/components/right-panel';

function RightPanelContent() {
  const router = useRouter();
  useResponsiveNavigation();

  // Close the panel when pressing the back button
  useEffect(() => {
    const handleBack = () => {
      router.back();
    };

    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [router]);

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col">
      <div className="flex-1 overflow-auto p-4 space-y-8 pb-48">
        <ChatView />
        <PostsView />
        <StatsView />
      </div>
      
      {/* Fixed bottom buttons */}
      <div className="p-4 pt-3 pb-20 border-t border-border bg-background/95 backdrop-blur-sm fixed bottom-0 left-0 right-0 z-[60]">
        <div className="grid grid-cols-2 gap-3">
          <button 
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => {/* TODO: Handle messages */}}
          >
            <MessageSquare className="h-4 w-4" />
            Messages
          </button>
          <button 
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            onClick={() => {/* TODO: Handle roadblock */}}
          >
            <AlertCircle className="h-4 w-4" />
            Roadblocked?
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RightPanelPage() {
  return (
    <RightPanelProvider>
      <RightPanelContent />
    </RightPanelProvider>
  );
}
