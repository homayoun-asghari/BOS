'use client';

import React, { createContext, useContext, useState } from 'react';
import { RightPanelContextType, RightPanelProviderProps, RightPanelView } from '../types/right-panel.types';

const RightPanelContext = createContext<RightPanelContextType | undefined>(undefined);

export function RightPanelProvider({ 
  children, 
  defaultView = 'stats' // Default to showing stats
}: RightPanelProviderProps) {
  const [currentView, setCurrentView] = useState<RightPanelView>(defaultView);
  const [isOpen, setIsOpen] = useState(false);

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
