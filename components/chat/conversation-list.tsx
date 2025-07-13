'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationItem } from './conversation-item';
import { Conversation } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: string;
  activeConversation: string | null;
  onSelectConversation: (id: string) => void;
  className?: string;
}

export function ConversationList({
  conversations,
  currentUserId,
  activeConversation,
  onSelectConversation,
  className,
}: ConversationListProps) {
  if (!conversations.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 text-center">
        No conversations yet. Start a new one!
      </div>
    );
  }

  return (
    <ScrollArea className={cn('flex-1', className)}>
      <div className="space-y-1 p-2">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === activeConversation}
            currentUserId={currentUserId}
            onClick={() => onSelectConversation(conversation.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
