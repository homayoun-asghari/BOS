"use client";

import { useState } from 'react';
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
      // Close the code accordion when user menu opens
      setIsCodeAccordionOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-16 flex items-center px-4">
          {/* The Code Component */}
          <TheCode 
            isOpen={isCodeAccordionOpen} 
            onOpenChange={setIsCodeAccordionOpen} 
          />

          {/* User Menu */}
          <UserMenu 
            user={user}
            loading={userLoading}
            onOpenChange={handleUserMenuOpenChange}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenHelp={() => setIsHelpOpen(true)}
          />
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex items-start justify-center overflow-hidden p-4">
          <div className="w-full max-w-4xl h-full overflow-y-auto rounded-lg border border-border shadow-sm">
            <div className="p-4">
              <RoadmapVisualization />
            </div>
          </div>
        </div>
        
        <DashboardActionButton 
          onClick={() => setIsRoadmapOpen(true)}
          tooltip="Create or view your roadmap"
        />
      </main>

      {/* Settings Modal */}
      <SettingsModal 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
        user={user} 
      />
      
      {/* Help Modal */}
      <HelpModal 
        open={isHelpOpen}
        onOpenChange={setIsHelpOpen}
      />
      <RoadmapModal 
        open={isRoadmapOpen} 
        onOpenChange={setIsRoadmapOpen} 
      />
    </div>
  );
}
