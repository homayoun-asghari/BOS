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
import { RightPanel } from "@/components/right-panel";

import React from "react";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  
  // User and modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCodeAccordionOpen, setIsCodeAccordionOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const { user, isLoading: userLoading } = useAuth();

  // Cleanup any body styles on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
    };
  }, []);

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

  // Exclude home, terms, privacy, help, contact, and about pages from the main layout
  if (isHome || pathname === '/terms' || pathname === '/privacy' || pathname === '/help' || pathname === '/contact' || pathname === '/about') {
    return <>{children}</>;
  }

  return (
    <ChatProvider>
      <div className="flex flex-col min-h-screen bg-background">
        <Head>
          <title>BOS Platform</title>
          <meta name="description" content="BOS Platform" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        </Head>

        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Sidebar - Only shown on lg screens and up */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>
          
          {/* Main content area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Fixed header */}
            <Navbar
              user={user}
              userLoading={userLoading}
              isCodeAccordionOpen={isCodeAccordionOpen}
              onCodeAccordionChange={setIsCodeAccordionOpen}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenHelp={() => setIsHelpOpen(true)}
            />

            {/* Scrollable content area */}
            <div 
              ref={mainRef}
              className="flex-1 overflow-y-auto"
              style={{
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 4rem)',
                paddingRight: 'var(--right-panel-width)'
              }}
            >
              <div className="w-full p-4 md:p-8 lg:px-20 transition-all duration-300">
                {children}
              </div>
            </div>
          </div>
          
          {/* Right Panel - Handles its own resizing */}
          <RightPanel />
        </div>
      
        {/* Mobile bottom navigation - Only show when user is logged in */}
        {user && !isHome && (
          <div className="lg:hidden">
            <Sidebar />
          </div>
        )}

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
    </ChatProvider>
  );
}
