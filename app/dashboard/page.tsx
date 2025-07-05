"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { DashboardActionButton } from "@/components/dashboard/DashboardActionButton";
import { RoadmapModal } from "@/components/roadmap/roadmap-modal";
import { RoadmapVisualization } from "@/components/dashboard/roadmap-visualization";

export default function DashboardPage() {
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [hasRoadmap, setHasRoadmap] = useState(false);
  const [loadingRoadmap, setLoadingRoadmap] = useState(true);
  const { user } = useUser();

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
    <>
      <div className="h-full">
        <RoadmapVisualization />
      </div>

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

      <RoadmapModal
        open={isRoadmapOpen}
        onOpenChange={(open) => {
          setIsRoadmapOpen(open);
          if (!open) setHasRoadmap(true);
        }}
      />
    </>
  );
}
