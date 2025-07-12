'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MobileRightPanelContextType {
  showRightPanel: boolean;
  toggleRightPanel: () => void;
  setShowRightPanel: (show: boolean) => void;
}

const MobileRightPanelContext = createContext<MobileRightPanelContextType | undefined>(undefined);

export function MobileRightPanelProvider({ children }: { children: ReactNode }) {
  const [showRightPanel, setShowRightPanel] = useState(false);

  const toggleRightPanel = () => {
    setShowRightPanel(prev => !prev);
  };

  return (
    <MobileRightPanelContext.Provider value={{ showRightPanel, toggleRightPanel, setShowRightPanel }}>
      {children}
    </MobileRightPanelContext.Provider>
  );
}

export function useMobileRightPanel() {
  const context = useContext(MobileRightPanelContext);
  if (context === undefined) {
    throw new Error('useMobileRightPanel must be used within a MobileRightPanelProvider');
  }
  return context;
}
