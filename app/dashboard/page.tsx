"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { SettingsModal } from "@/components/settings/settings-modal";
import { HelpModal } from "@/components/help/help-modal";
import { DashboardActionButton } from "@/components/dashboard/DashboardActionButton";
import { RoadmapModal } from "@/components/roadmap/roadmap-modal";
import { RoadmapVisualization } from "@/components/dashboard/roadmap-visualization";
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';

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
          <Navbar
            user={user}
            userLoading={userLoading}
            isCodeAccordionOpen={isCodeAccordionOpen}
            onCodeAccordionChange={setIsCodeAccordionOpen}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenHelp={() => setIsHelpOpen(true)}
          />

          <main className="flex-1 overflow-auto pb-24 md:pb-0">
            <div className="w-full p-6">
              <div className="h-full">
                <RoadmapVisualization />
              </div>
            </div>
          </main>

          {!loadingRoadmap && !hasRoadmap && (
            <div className="sticky bottom-4 z-30 w-full px-4">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <DashboardActionButton
                  onClick={() => setIsRoadmapOpen(true)}
                  tooltip="Create your roadmap"
                  className="w-full md:w-auto"
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
