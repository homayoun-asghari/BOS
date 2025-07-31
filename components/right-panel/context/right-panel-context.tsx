'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from '@/components/utils/SearchParamsProvider';
import { RightPanelContextType, RightPanelProviderProps, RightPanelView } from '../types/right-panel.types';

const RightPanelContext = createContext<RightPanelContextType | undefined>(undefined);

export function RightPanelProvider({ 
  children, 
  defaultView = 'stats' // Default to showing stats
}: RightPanelProviderProps) {
  // We'll use router later for updating URLs when posts are selected
  const searchParams = useSearchParams();
  const [currentView, setCurrentView] = useState<RightPanelView>(defaultView);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Handle URL parameters for posts
  useEffect(() => {
    const postId = searchParams.get('post');
    if (postId) {
      setSelectedPostId(postId);
      setCurrentView('posts');
      setIsOpen(true);
    } else {
      setSelectedPostId(null);
    }
  }, [searchParams]);

  const openPanel = (view: RightPanelView) => {
    setCurrentView(view);
    setIsOpen(true);
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  const togglePanel = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <RightPanelContext.Provider
      value={{
        currentView,
        isOpen,
        selectedPostId,
        setSelectedPostId,
        openPanel,
        closePanel,
        togglePanel
      }}
    >
      {children}
    </RightPanelContext.Provider>
  );
}

export function useRightPanel() {
  const context = useContext(RightPanelContext);
  if (context === undefined) {
    throw new Error('useRightPanel must be used within a RightPanelProvider');
  }
  return context;
}
