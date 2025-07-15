"use client";


import { RoadmapVisualization } from "@/components/dashboard/roadmap-visualization";
import { RightPanelProvider, RightPanel } from "@/components/right-panel";
import { ChatView } from "@/components/chat/chat-view";
import { PostsView } from "@/components/right-panel/components/posts-view";
import { StatsView } from "@/components/right-panel/components/stats-view";
import { useRightPanel } from "@/components/right-panel/context/right-panel-context";

function DashboardContent() {
  const { currentView } = useRightPanel();

  return (
    <RightPanelProvider>
      <div className="flex flex-col h-[100vh] w-full">
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-h-0 relative w-full">
            <div className="h-full overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <RoadmapVisualization />
              </div>
              {/* FAB removed as per request */}
            </div>
          </div>

          <RightPanel>
            {currentView === 'chat' && <ChatView />}
            {currentView === 'posts' && <PostsView />}
            {currentView === 'stats' && <StatsView />}
          </RightPanel>
        </div>
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
