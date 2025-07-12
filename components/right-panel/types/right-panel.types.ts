export type RightPanelView = 'chat' | 'posts' | 'stats';

export interface RightPanelContextType {
  currentView: RightPanelView;
  openPanel: (view: RightPanelView) => void;
}

export interface RightPanelProviderProps {
  children: React.ReactNode;
  defaultView?: RightPanelView;
}
