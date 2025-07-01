"use client";

import { Button } from "@/components/ui/button";
import { useState } from 'react';
import { useUser } from "@/hooks/useUser";
import { SettingsModal } from "@/components/settings/settings-modal";
import { HelpModal } from "@/components/help/help-modal";
import { TheCode } from "@/components/dashboard/TheCode";
import { UserMenu } from "@/components/dashboard/UserMenu";

export default function DashboardPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { user, loading: userLoading } = useUser();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-16 flex items-center px-4">
          {/* The Code Component */}
          <TheCode />

          {/* User Menu */}
          <UserMenu 
            user={user}
            loading={userLoading}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenHelp={() => setIsHelpOpen(true)}
          />
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Empty space that pushes the button down */}
        <div className="flex-1"></div>
        
        {/* Fixed bottom container */}
        <div className="sticky bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm">
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <Button size="lg" className="w-full py-6 text-lg font-medium">
                Start
              </Button>
            </div>
          </div>
        </div>
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


    </div>
  );
}
