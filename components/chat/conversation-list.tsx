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
  console.log('[ConversationList] Rendering with:', {
    conversationCount: conversations.length,
    currentUserId,
    activeConversation,
    conversationIds: conversations.map(c => c.id)
  });
  
  const handleSelectConversation = (id: string) => {
    console.log('[ConversationList] Conversation selected:', id);
    onSelectConversation(id);
  };
  if (!conversations.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 text-center">
        No conversations yet. Start a new one!
      </div>
    );
  }

  // Ensure we have valid conversations with unique IDs before rendering
  const validConversations = conversations.filter(conv => conv && conv.id);
  
  // Log any invalid conversations for debugging
  if (validConversations.length !== conversations.length) {
    console.warn('Filtered out invalid conversations:', {
      total: conversations.length,
      valid: validConversations.length,
      invalid: conversations.length - validConversations.length
    });
  }

  // Create a map to track seen conversation IDs
  const seenIds = new Set();
  const uniqueConversations = validConversations.filter(conv => {
    if (seenIds.has(conv.id)) {
      console.warn('Duplicate conversation ID found:', conv.id);
      return false;
    }
    seenIds.add(conv.id);
    return true;
  });

  return (
    <ScrollArea className={cn('flex-1', className)}>
      <div className="space-y-1 p-2">
        {uniqueConversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === activeConversation}
            currentUserId={currentUserId}
            onClick={() => handleSelectConversation(conversation.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
