"use client";

import { useState } from "react";
import { useUser } from "@/hooks/useUser";
import { SettingsModal } from "@/components/settings/settings-modal";
import { HelpModal } from "@/components/help/help-modal";
import { TheCode } from "@/components/dashboard/TheCode";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { DashboardActionButton } from "@/components/dashboard/DashboardActionButton";
import { RoadmapModal } from "@/components/roadmap/roadmap-modal";
import { RoadmapVisualization } from "@/components/dashboard/roadmap-visualization";

export default function DashboardPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { user, loading: userLoading } = useUser();
  const [isCodeAccordionOpen, setIsCodeAccordionOpen] = useState(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);

  const handleUserMenuOpenChange = (open: boolean) => {
    if (open) {
      setIsCodeAccordionOpen(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-16 flex items-center px-4">
          <TheCode
            isOpen={isCodeAccordionOpen}
            onOpenChange={setIsCodeAccordionOpen}
          />
          <UserMenu
            user={user}
            loading={userLoading}
            onOpenChange={handleUserMenuOpenChange}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenHelp={() => setIsHelpOpen(true)}
          />
        </div>
      </header>

      {/* Main content with scrollable Roadmap */}
      <main className="flex-1 flex items-start justify-center overflow-hidden">
        <div className="w-full max-w-4xl h-full overflow-hidden rounded-lg border border-border shadow-sm m-4">
          <div className="h-full overflow-y-auto p-4">
            <RoadmapVisualization />
          </div>
        </div>
      </main>

      {/* Floating action button (fixed) */}
      <DashboardActionButton
        onClick={() => setIsRoadmapOpen(true)}
        tooltip="Create or view your roadmap"
      />

      {/* Modals */}
      <SettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        user={user}
      />
      <HelpModal open={isHelpOpen} onOpenChange={setIsHelpOpen} />
      <RoadmapModal open={isRoadmapOpen} onOpenChange={setIsRoadmapOpen} />
    </div>
  );
}
