export type RightPanelView = 'chat' | 'posts' | 'stats' | 'messages' | 'search';

export interface RightPanelContextType {
  currentView: RightPanelView;
  isOpen: boolean;
  selectedPostId: string | null;
  setSelectedPostId: (postId: string | null) => void;
  openPanel: (view: RightPanelView) => void;
  closePanel: () => void;
  togglePanel: () => void;
}

export interface RightPanelProviderProps {
  children: React.ReactNode;
  defaultView?: RightPanelView;
}
