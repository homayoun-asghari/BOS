export type RightPanelView = 'chat' | 'posts' | 'stats' | 'messages';

export interface RightPanelContextType {
  currentView: RightPanelView;
  isOpen: boolean;
  openPanel: (view: RightPanelView) => void;
  closePanel: () => void;
  togglePanel: () => void;
}

export interface RightPanelProviderProps {
  children: React.ReactNode;
  defaultView?: RightPanelView;
}
