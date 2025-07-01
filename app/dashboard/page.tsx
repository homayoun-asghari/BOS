"use client";

import { useState } from 'react';
import { useUser } from "@/hooks/useUser";
import { SettingsModal } from "@/components/settings/settings-modal";
import { HelpModal } from "@/components/help/help-modal";
import { TheCode } from "@/components/dashboard/TheCode";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { DashboardActionButton } from "@/components/dashboard/DashboardActionButton";

export default function DashboardPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false); // Used in handleUserMenuOpenChange
  const { user, loading: userLoading } = useUser();
  const [isCodeAccordionOpen, setIsCodeAccordionOpen] = useState(false);
  
  const handleUserMenuOpenChange = (open: boolean) => {
    setIsUserMenuOpen(open);
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
        {/* Empty space that pushes the button down */}
        <div className="flex-1"></div>
        
        {/* Dashboard Action Button */}
        <DashboardActionButton 
          onClick={() => {
            // Handle button click
            console.log('Dashboard action button clicked');
          }}
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
    </div>
  );
}
