"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { SettingsModal } from "@/components/settings/settings-modal";
import { HelpModal } from "@/components/help/help-modal";
import { TheCode } from "@/components/dashboard/TheCode";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { DashboardActionButton } from "@/components/dashboard/DashboardActionButton";
import { RoadmapModal } from "@/components/roadmap/roadmap-modal";
import { RoadmapVisualization } from "@/components/dashboard/roadmap-visualization";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { user, loading: userLoading } = useUser();
  const [isCodeAccordionOpen, setIsCodeAccordionOpen] = useState(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [hasRoadmap, setHasRoadmap] = useState(false);
  const [loadingRoadmap, setLoadingRoadmap] = useState(true);

  useEffect(() => {
    const checkRoadmap = async () => {
      if (!user) {
        setLoadingRoadmap(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('roadmaps')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) throw error;
        setHasRoadmap(!!(data && data.length > 0));
      } catch (error) {
        console.error('Error checking for roadmap:', error);
      } finally {
        setLoadingRoadmap(false);
      }
    };

    checkRoadmap();
  }, [user]);

  const handleUserMenuOpenChange = (open: boolean) => {
    if (open) {
      setIsCodeAccordionOpen(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-10"
        style={{
          backgroundImage: "url('/asset/montain.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center -70%',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      />
      
      <div className="relative z-10 flex h-full w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
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

          <main className="flex-1 overflow-auto pb-24 md:pb-0">
            <div className="mx-auto p-4 h-full">
              <RoadmapVisualization />
            </div>
          </main>

          {!loadingRoadmap && !hasRoadmap && (
            <div className="sticky bottom-4 z-30 w-full px-4">
              <div className="max-w-4xl mx-auto">
                <DashboardActionButton
                  onClick={() => setIsRoadmapOpen(true)}
                  tooltip="Create your roadmap"
                >
                  Create Roadmap
                </DashboardActionButton>
              </div>
            </div>
          )}
        </div>
      </div>

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
