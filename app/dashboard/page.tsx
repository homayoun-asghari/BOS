"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { RoadmapModal } from "@/components/roadmap/roadmap-modal";
import { RoadmapVisualization } from "@/components/dashboard/roadmap-visualization";
import { RightPanelProvider, RightPanel } from "@/components/right-panel";
import { ChatView } from "@/components/chat/chat-view";
import { PostsView } from "@/components/right-panel/components/posts-view";
import { StatsView } from "@/components/right-panel/components/stats-view";
import { useRightPanel } from "@/components/right-panel/context/right-panel-context";

function DashboardContent() {
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [hasRoadmap, setHasRoadmap] = useState(false);
  const [loadingRoadmap, setLoadingRoadmap] = useState(true);
  const { user } = useUser();
  const { currentView } = useRightPanel();

  useEffect(() => {
    const checkRoadmap = async () => {
      if (!user) {
        setLoadingRoadmap(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("roadmaps")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (error) throw error;
        setHasRoadmap(!!(data && data.length > 0));
      } catch (error) {
        console.error("Error checking for roadmap:", error);
      } finally {
        setLoadingRoadmap(false);
      }
    };

    checkRoadmap();
  }, [user]);

  return (
    <RightPanelProvider>
      <div className="flex flex-col h-[100vh] w-full">
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-h-0 relative w-full">
            <div className="flex-1 overflow-auto w-full">
              <RoadmapVisualization />
            </div>

            {!loadingRoadmap && !hasRoadmap && (
              <div className="fixed bottom-6 right-6 lg:right-[calc(375px+1.5rem)] z-30">
                <button
                  onClick={() => setIsRoadmapOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 shadow-lg h-14 w-14 flex items-center justify-center transition-all duration-200 hover:scale-105"
                  aria-label="Create Roadmap"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>
            )}
          </div>

          <RightPanel>
            {currentView === 'chat' && <ChatView />}
            {currentView === 'posts' && <PostsView />}
            {currentView === 'stats' && <StatsView />}
          </RightPanel>
        </div>

        <RoadmapModal
          open={isRoadmapOpen}
          onOpenChange={(open) => {
            setIsRoadmapOpen(open);
            if (!open) setHasRoadmap(true);
          }}
        />
      </div>
    </RightPanelProvider>
  );
}

export default function DashboardPage() {
  return (
    <RightPanelProvider>
      <DashboardContent />
    </RightPanelProvider>
  );
}
