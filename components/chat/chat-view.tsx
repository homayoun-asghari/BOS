'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useChat } from '@/hooks/use-chat';
import { useUser } from '@/hooks/useUser';
import { ConversationList } from './conversation-list';
import { MessageItem } from './message-item';
import { ChatHeader } from './chat-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface ChatViewProps {
  className?: string;
}

export function ChatView({ className }: ChatViewProps) {
  const { user } = useUser();
  const {
    conversations,
    messages,
    currentConversation,
    setActiveConversation,
    sendMessage,
    isLoading,
    error
  } = useChat();
  
  const activeConversation = currentConversation?.id || null;

  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim() && activeConversation) {
      sendMessage(newMessage);
      setNewMessage('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-destructive">
        Error loading chat: {error.message}
      </div>
    );
  }

  // Show chat view if a conversation is selected, otherwise show conversation list
  if (activeConversation) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <ChatHeader 
          conversation={currentConversation}
          currentUserId={user?.id || ''}
          onBack={() => setActiveConversation(null)}
        />
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isCurrentUser={message.user_id === user?.id}
            />
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button size="icon" onClick={handleSendMessage}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show conversation list when no conversation is selected
  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Messages</h2>
      </div>
      <ConversationList
        conversations={conversations}
        currentUserId={user?.id || ''}
        activeConversation={null}
        onSelectConversation={setActiveConversation}
        className="flex-1"
      />
    </div>
  );
}
