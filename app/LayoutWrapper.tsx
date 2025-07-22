'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import { SettingsModal } from '@/components/settings/settings-modal';
import { HelpModal } from '@/components/help/help-modal';
import Head from 'next/head';
import { ChatProvider } from '@/context/chat-context';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isUpgradePage = pathname?.startsWith('/upgrade');
  const isDashboard = pathname?.startsWith('/dashboard');
  
  // User and modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCodeAccordionOpen, setIsCodeAccordionOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const { user, isLoading: userLoading } = useAuth();

  // Handle mobile viewport resizing when keyboard appears
  useEffect(() => {
    if (typeof window === 'undefined' || !('visualViewport' in window)) return;

    const handleResize = () => {
      const viewport = window.visualViewport;
      const viewportHeight = viewport?.height || 0;
      const windowHeight = window.innerHeight;
      
      // Check if keyboard is visible (viewport height is less than window height)
      const isKeyboardVisible = viewportHeight < windowHeight * 0.85;
      
      // Add or remove a class to the body when keyboard is visible
      if (isKeyboardVisible) {
        document.body.classList.add('keyboard-visible');
      } else {
        document.body.classList.remove('keyboard-visible');
      }
    };

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', handleResize);
    viewport?.addEventListener('scroll', handleResize);

    return () => {
      viewport?.removeEventListener('resize', handleResize);
      viewport?.removeEventListener('scroll', handleResize);
      document.body.classList.remove('keyboard-visible');
    };
  }, []);

  if (isHome || isUpgradePage) {
    return <>{children}</>;
  }

  return (
    <ChatProvider>
      <div className="flex-1 flex flex-col min-h-0 bg-background">
      <Head>
        <title>BOS Platform</title>
        <meta name="description" content="BOS Platform" />
      </Head>
      
      {/* Main content area - Single scroll container */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop Sidebar - Only shown on lg screens and up */}
        <div className="h-full">
          <Sidebar className="hidden lg:block" />
        </div>
        
        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Fixed header */}
          <Navbar
            user={user}
            userLoading={userLoading}
            isCodeAccordionOpen={isCodeAccordionOpen}
            onCodeAccordionChange={setIsCodeAccordionOpen}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenHelp={() => setIsHelpOpen(true)}
            fullWidth={!isDashboard}
          />

          {/* Scrollable content area */}
          <div 
            ref={mainRef}
            className="flex-1 min-h-0 overflow-y-auto"
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 4rem)'
            }}
          >
            <div className="w-full p-4 md:p-6 lg:pl-24 transition-all duration-300 group-has-[.sidebar:hover]:lg:pl-[13rem]">
              {children}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile bottom navigation */}
      <div className="lg:hidden">
        <Sidebar />
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
    </ChatProvider>
  );
}
