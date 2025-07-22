'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useChatContext } from '@/context/chat-context';
import { useAuth } from '@/components/auth/AuthProvider';
import { ConversationList } from './conversation-list';
import { MessageItem } from './message-item';
import { ChatHeader } from './chat-header';
import { MessageInput } from './message-input';

interface ChatViewProps {
  className?: string;
  onInputFocusChange?: (isFocused: boolean) => void;
  onActiveConversationChange?: (isActive: boolean) => void;
}

export function ChatView({ className, onInputFocusChange, onActiveConversationChange }: ChatViewProps) {
  console.log('[ChatView] Rendering with props:', { className });
  const { user } = useAuth();
  console.log('[ChatView] Current user:', user?.id);
  
  const {
    conversations,
    messages,
    currentConversation,
    setActiveConversation,
    sendMessage,
    isLoading,
    error
  } = useChatContext();
  
  const activeConversation = currentConversation?.id || null;
  console.log('[ChatView] Current conversation state:', { 
    activeConversation, 
    hasCurrentConversation: !!currentConversation,
    conversationCount: conversations.length,
    messageCount: messages.length,
    isLoading,
    error: error?.message 
  });

  // Notify parent about active conversation state
  useEffect(() => {
    console.log('[ChatView] Active conversation changed:', { 
      activeConversation,
      hasCurrentConversation: !!currentConversation,
      conversationCount: conversations.length
    });
    
    // Ensure we have a valid conversation before notifying parent
    if (activeConversation && currentConversation) {
      console.log('[ChatView] Notifying parent of active conversation');
      onActiveConversationChange?.(true);
    } else if (!activeConversation) {
      console.log('[ChatView] Notifying parent of no active conversation');
      onActiveConversationChange?.(false);
    }
  }, [activeConversation, currentConversation, conversations, onActiveConversationChange]);
  
  // Log when messages or conversations change
  useEffect(() => {
    console.log('[ChatView] Messages updated:', {
      count: messages.length,
      hasActiveConversation: !!activeConversation,
      activeConversationId: activeConversation
    });
  }, [messages, activeConversation]);
  
  // Log when conversations change
  useEffect(() => {
    console.log('[ChatView] Conversations updated:', {
      count: conversations.length,
      conversationIds: conversations.map(c => c.id),
      activeConversationId: activeConversation,
      isActiveInList: conversations.some(c => c.id === activeConversation)
    });
  }, [conversations, activeConversation]);

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
        <div className="sticky bottom-0 left-0 right-0 bg-background border-t border-border z-50">
          <div className="max-w-3xl mx-auto w-full">
            <MessageInput
              value={newMessage}
              onChange={setNewMessage}
              onSubmit={handleSendMessage}
              onFocus={() => onInputFocusChange?.(true)}
              onBlur={() => onInputFocusChange?.(false)}
              disabled={!activeConversation}
              placeholder="Type a message..."
              className="border-t-0 border-x-0 rounded-none"
            />
          </div>
          {/* Safe area for mobile browsers - accounts for bottom navigation */}
          <div className="h-20 lg:h-4" />
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
