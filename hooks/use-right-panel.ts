'use client';

import { useRightPanel as useRightPanelContext } from '@/components/right-panel';

export function useRightPanel() {
  const {
    isOpen,
    currentView,
    openPanel,
    closePanel,
    togglePanel,
  } = useRightPanelContext();

  const openChat = () => openPanel('chat');
  const openPosts = () => openPanel('posts');
  const openStats = () => openPanel('stats');

  return {
    // State
    isOpen,
    currentView,
    
    // Actions
    openPanel,
    closePanel,
    togglePanel,
    
    // Convenience methods
    openChat,
    openPosts,
    openStats,
  };
}
