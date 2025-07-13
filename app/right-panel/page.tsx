"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageSquare, FileText, ArrowLeft, Search } from "lucide-react";

// Custom hook to handle responsive behavior
function useResponsiveNavigation() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const isMobileView = window.innerWidth < 1023; // md breakpoint
      setIsMobile(isMobileView);

      // If screen is md or larger and we're on the right panel page, redirect to dashboard
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
import { ChatView } from "@/components/chat/chat-view";
import { StatsView } from "@/components/right-panel/components/stats-view";
import { RightPanelProvider } from "@/components/right-panel";

type ViewType = "default" | "messages" | "posts";

function RightPanelContent() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ViewType>("default");
  useResponsiveNavigation();

  // Close the panel when pressing the back button
  useEffect(() => {
    const handleBack = () => {
      router.back();
    };

    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, [router]);

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col">
      <div className="flex flex-col h-full">
        {/* Header - Only show for default and posts views */}
        {activeView !== "messages" && (
          <div className="p-4 border-b border-border">
            {activeView === "default" ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            ) : (
              <h2 className="text-lg font-semibold">Posts</h2>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeView === "default" && <StatsView />}
          {activeView === "messages" && <ChatView />}
          {activeView === "posts" && (
            <div className="p-6">
              <p>Posts</p>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="px-4 pt-0 pb-2 bg-background/95 backdrop-blur-sm mt-auto">
          <div className="mb-9 pb-9">
            <div className="grid grid-cols-2 gap-3">
              <button
                className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg ${
                  activeView === "messages"
                    ? "bg-primary/90 text-primary-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                } transition-colors`}
                onClick={() =>
                  setActiveView(
                    activeView === "messages" ? "default" : "messages"
                  )
                }
              >
                {activeView === "messages" ? (
                  <ArrowLeft className="h-4 w-4" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                {activeView === "messages" ? "Back" : "Messages"}
              </button>
              <button
                className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg ${
                  activeView === "posts"
                    ? "bg-primary/90 text-primary-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                } transition-colors`}
                onClick={() =>
                  setActiveView(
                    activeView === "posts" ? "default" : "posts"
                  )
                }
              >
                {activeView === "posts" ? (
                  <ArrowLeft className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {activeView === "posts" ? "Back" : "Posts"}
              </button>
            </div>
          </div>
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
