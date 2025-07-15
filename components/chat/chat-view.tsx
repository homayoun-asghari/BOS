'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useChat } from '@/hooks/use-chat';
import { useAuth } from '@/components/auth/AuthProvider';
import { ConversationList } from './conversation-list';
import { MessageItem } from './message-item';
import { ChatHeader } from './chat-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface ChatViewProps {
  className?: string;
  onInputFocusChange?: (isFocused: boolean) => void;
  onActiveConversationChange?: (isActive: boolean) => void;
}

export function ChatView({ className, onInputFocusChange, onActiveConversationChange }: ChatViewProps) {
  const { user } = useAuth();
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

  // Notify parent about active conversation state
  useEffect(() => {
    onActiveConversationChange?.(!!activeConversation);
  }, [activeConversation, onActiveConversationChange]);

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
      <div className={cn('fixed inset-0 z-40 flex flex-col bg-background', className)}>
        <ChatHeader 
          conversation={currentConversation}
          currentUserId={user?.id || ''}
          onBack={() => setActiveConversation(null)}
          className="flex-shrink-0 border-b border-border"
        />
        
        {/* Messages Container - Takes remaining space and allows scrolling */}
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          <div className="max-w-3xl mx-auto w-full space-y-4">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                isCurrentUser={message.user_id === user?.id}
              />
            ))}
          </div>
        </div>

        {/* Message Input - Fixed at bottom with safe area for mobile */}
        <div className="sticky bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-50 pb-0">
          <div className="max-w-3xl mx-auto w-full">
            <div className="flex gap-2 w-full">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                onFocus={() => onInputFocusChange?.(true)}
                onBlur={() => onInputFocusChange?.(false)}
                className="flex-1 min-h-[40px]"
              />
              <Button 
                size="icon" 
                onClick={handleSendMessage} 
                className="h-10 w-10 flex-shrink-0"
                type="button"
                disabled={!newMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {/* Safe area for mobile browsers - accounts for bottom navigation */}
            <div className="h-20 lg:h-4" />
          </div>
        </div>
      </div>
    );
  }

  // Show conversation list when no conversation is selected
  return (
    <div className={cn('flex flex-col h-full', className)}>
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
