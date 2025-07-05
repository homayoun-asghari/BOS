'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { useUser } from '@/hooks/useUser';
import { SettingsModal } from '@/components/settings/settings-modal';
import { HelpModal } from '@/components/help/help-modal';
import Head from 'next/head';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isUpgradePage = pathname?.startsWith('/upgrade');
  
  // User and modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCodeAccordionOpen, setIsCodeAccordionOpen] = useState(false);
  const { user, loading: userLoading } = useUser();

  if (isHome || isUpgradePage) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <Head>
        <title>BOS Platform</title>
        <meta name="description" content="BOS Platform" />
      </Head>
      
      {/* Background Image - Above sidebar */}
      <div 
        className="fixed inset-0 z-10 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "url('/asset/montain.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center -70%',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      />
      
      {/* Main content */}
      <div className="relative z-0 flex flex-1 h-full w-full overflow-hidden">
        <div className="h-full">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          <Navbar
            user={user}
            userLoading={userLoading}
            isCodeAccordionOpen={isCodeAccordionOpen}
            onCodeAccordionChange={setIsCodeAccordionOpen}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenHelp={() => setIsHelpOpen(true)}
          />

          <main className="flex-1 overflow-auto bg-background">
            <div className="w-full p-6">
              <div className="h-full">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Modals */}
      {user && (
        <>
          <SettingsModal
            user={user}
            open={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
          />
          <HelpModal
            open={isHelpOpen}
            onOpenChange={setIsHelpOpen}
          />
        </>
      )}
    </div>
  );
}
