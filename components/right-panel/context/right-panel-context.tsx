'use client';

import React, { createContext, useContext, useState } from 'react';
import { RightPanelContextType, RightPanelProviderProps, RightPanelView } from '../types/right-panel.types';

const RightPanelContext = createContext<RightPanelContextType | undefined>(undefined);

export function RightPanelProvider({ 
  children, 
  defaultView = 'stats' // Default to showing stats
}: RightPanelProviderProps) {
  const [currentView, setCurrentView] = useState<RightPanelView>(defaultView);

  const openPanel = (view: RightPanelView) => {
    setCurrentView(view);
  };

  return (
    <RightPanelContext.Provider
      value={{
        currentView,
        openPanel,
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
