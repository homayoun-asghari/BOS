import { RightPanelView } from '../right-panel';

export function ChatView() {
  return (
    <RightPanelView view="chat">
      <div className="space-y-4">
        <h3 className="font-medium">Chat Room</h3>
        <div className="space-y-2">
          {/* Chat messages would go here */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm">Welcome to the chat room!</p>
          </div>
        </div>
      </div>
    </RightPanelView>
  );
}
