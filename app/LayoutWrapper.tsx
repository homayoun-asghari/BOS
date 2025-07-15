'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import { SettingsModal } from '@/components/settings/settings-modal';
import { HelpModal } from '@/components/help/help-modal';
import Head from 'next/head';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isUpgradePage = pathname?.startsWith('/upgrade');
  const isDashboard = pathname?.startsWith('/dashboard');
  
  // User and modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCodeAccordionOpen, setIsCodeAccordionOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const { user, isLoading: userLoading } = useAuth();

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.classList.remove('overflow-auto');
      mainRef.current.classList.add('overflow-visible');
    }
  }, []);

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
      {/* <div 
        className="fixed inset-0 z-10 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "url('/asset/montain.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center -70%',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      /> */}
      
      {/* Main content */}
      <div className="relative z-0 flex flex-1 h-full w-full overflow-hidden">
        {/* Desktop Sidebar - Only shown on lg screens and up */}
        <div className="h-full sidebar">
          <Sidebar className="hidden lg:block" />
        </div>
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          <Navbar
            user={user}
            userLoading={userLoading}
            isCodeAccordionOpen={isCodeAccordionOpen}
            onCodeAccordionChange={setIsCodeAccordionOpen}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenHelp={() => setIsHelpOpen(true)}
            fullWidth={!isDashboard}
          />

          <main 
            ref={mainRef}
            className="flex-1 bg-background relative overflow-auto"
          >
            <div className="w-full p-4 md:p-6 lg:pl-24 transition-all duration-300 group-has-[.sidebar:hover]:lg:pl-[13rem]">
              <div className="h-full">
                {children}
              </div>
            </div>
          </main>
        </div>

        {/* Bottom Navigation - Shown on md and sm screens */}
        <Sidebar className="lg:hidden" />
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
