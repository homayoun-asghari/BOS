import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChatMessage, Conversation } from '@/types/chat';
import { useAuth } from '@/components/auth/AuthProvider';
import { chatService } from '@/lib/supabase/chat-service';

// Extend the User type to include additional properties
interface UserProfile {
  id: string;
  username?: string;
  avatar_url?: string | null;
  email?: string;
}

interface ChatUser {
  id: string;
  username: string;
  avatar_url: string | null;
  email: string;
}

interface UseChatReturn {
  conversations: Conversation[];
  messages: ChatMessage[];
  currentConversation: Conversation | null;
  activeConversation: string | null;
  searchResults: ChatUser[];
  isSearching: boolean;
  isLoading: boolean;
  isLoadingMessages: boolean;
  error: Error | null;
  fetchConversations: () => Promise<Conversation[]>;
  fetchMessages: (conversationId: string) => Promise<ChatMessage[]>;
  sendMessage: (content: string, mediaUrls?: string[]) => Promise<ChatMessage | null>;
  setActiveConversation: (conversationId: string | null) => void;
  searchUsers: (query: string) => Promise<ChatUser[]>;
  startDirectMessage: (otherUserId: string) => Promise<Conversation | null>;
  createRoom: (userIds: string[], isGroup?: boolean, name?: string) => Promise<Conversation | null>;
  markMessagesAsRead: (messageIds: string[], userId: string) => Promise<void>;
}

export function useChat(): UseChatReturn {
  const { user } = useAuth() as { user: UserProfile | null };
  const userId = user?.id;
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const subscriptionRef = useRef<(() => void) | null>(null);

  // Get current conversation details
  const currentConversation = useMemo<Conversation | null>(() => {
    if (!activeConversation) return null;
    return conversations.find(c => c.id === activeConversation) || null;
  }, [activeConversation, conversations]);

  // Fetch user's conversations
  const fetchConversations = useCallback(async (): Promise<Conversation[]> => {
    if (isLoading || !userId) return conversations; // Prevent concurrent fetches
    
    console.log('Fetching conversations...');
    setIsLoading(true);
    setError(null);
    
    try {
      const userConversations = await chatService.getConversations(userId);
      setConversations(userConversations);
      return userConversations;
    } catch (err) {
      const error = err as Error & { details?: string; hint?: string; code?: string };
      console.error('Error fetching conversations:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      setError(error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [userId, isLoading, conversations]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string): Promise<ChatMessage[]> => {
    if (isLoadingMessages) return [];
    
    console.log('Fetching messages for conversation:', conversationId);
    setIsLoadingMessages(true);
    setError(null);
    
    try {
      const conversationMessages = await chatService.getMessages(conversationId);
      setMessages(conversationMessages);
      return conversationMessages;
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err : new Error('Failed to load messages'));
      return [];
    } finally {
      setIsLoadingMessages(false);
    }
  }, [isLoadingMessages]);

  // Send a message handler
  const handleSendMessage = useCallback(async (content: string, mediaUrls: string[] = []): Promise<ChatMessage | null> => {
    if (!activeConversation || !userId) return null;
    
    console.log('Sending message to conversation:', activeConversation);
    
    try {
      const newMessage = await chatService.sendMessage(activeConversation, userId, content, mediaUrls);
      
      if (!newMessage) return null;
      
      // Update messages list
      setMessages(prev => [newMessage, ...prev]);
      
      // Update last message in conversations list
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id !== activeConversation) return conv;
          
          return {
            ...conv,
            last_message: {
              id: newMessage.id,
              content: newMessage.content,
              created_at: newMessage.created_at,
              user_id: userId,
              user: {
                id: userId,
                username: user?.username || 'You',
                avatar_url: user?.avatar_url || null
              }
            },
            updated_at: newMessage.created_at
          };
        })
      );
      
      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error : new Error('Failed to send message'));
      return null;
    }
  }, [activeConversation, userId, user?.username, user?.avatar_url]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!activeConversation || !userId) {
      // Clean up any existing subscription if activeConversation is cleared
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
      return;
    }
    
    const handleNewMessage = (newMessage: ChatMessage) => {
      // Don't show the user's own messages here (they're handled by sendMessage)
      if (newMessage.user_id === userId) return;
      
      // Add the new message to the current conversation's messages
      if (activeConversation === newMessage.room_id) {
        setMessages(prev => [newMessage, ...prev]);
        
        // Mark as read if the room is currently open
        if (activeConversation === newMessage.room_id && userId) {
          chatService.markMessagesAsRead([newMessage.id], userId);
        }
      }
      
      // Update the last message in the conversations list
      setConversations(prev =>
        prev.map(room => {
          if (room.id === newMessage.room_id) {
            return {
              ...room,
              last_message: {
                id: newMessage.id,
                content: newMessage.content,
                created_at: newMessage.created_at,
                user_id: newMessage.user_id
              },
              updated_at: newMessage.created_at,
              unread_count: 
                room.id === activeConversation 
                  ? 0 // No unread if it's the current room
                  : (room.unread_count || 0) + 1
            };
          }
          return room;
        })
      );
    };
    
    // Set up the subscription
    const unsubscribe = chatService.subscribeToNewMessages(activeConversation, handleNewMessage);
    
    // Store the unsubscribe function in the ref
    subscriptionRef.current = unsubscribe;
    
    // Clean up on unmount or when conversation changes
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, [activeConversation, userId]);

  // Load conversations on mount and when userId changes
  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      
      try {
        const conversations = await chatService.getConversations(userId);
        setConversations(conversations);
      } catch (error) {
        console.error('Failed to load conversations:', error);
        setError(error instanceof Error ? error : new Error('Failed to load conversations'));
      }
    };
    
    loadData();
  }, [userId]);

  // Load messages when active conversation changes
  useEffect(() => {
    let isMounted = true;
    
    const loadMessages = async (conversationId: string) => {
      if (!conversationId) {
        console.log('No active conversation, clearing messages');
        if (isMounted) {
          setMessages([]);
        }
        return;
      }
      
      console.log('Loading messages for conversation:', conversationId);
      
      try {
        await fetchMessages(conversationId);
        if (isMounted) {
          console.log('Messages loaded for conversation:', conversationId);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };
    
    // Only load messages if the conversation has actually changed
    if (activeConversation && activeConversation !== currentConversation?.id) {
      loadMessages(activeConversation);
    } else if (!activeConversation) {
      setMessages([]);
    }
    
    return () => {
      isMounted = false;
    };
  }, [activeConversation, currentConversation?.id, fetchMessages]);

  // Search for users
  const searchUsers = useCallback(async (query: string) => {
    if (!userId) return [];
    setIsSearching(true);
    try {
      const results = await chatService.searchUsers(query, userId);
      const users: ChatUser[] = results.map(user => ({
        id: user.id,
        username: user.username || user.email.split('@')[0],
        avatar_url: user.avatar_url,
        email: user.email
      }));
      setSearchResults(users);
      setIsSearching(false);
      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      setError(error as Error);
      setIsSearching(false);
      return [];
    }
  }, [userId]);

  // Start a new direct message conversation
  const startDirectMessage = useCallback(async (otherUserId: string) => {
    if (!userId) return null;
    try {
      const conversation = await chatService.createDirectMessage(userId, otherUserId);
      // Add to conversations if not already there
      setConversations(prev => {
        const exists = prev.some(c => c.id === conversation.id);
        return exists ? prev : [conversation, ...prev];
      });
      setActiveConversation(conversation.id);
      return conversation;
    } catch (error) {
      console.error('Error starting direct message:', error);
      setError(error as Error);
      return null;
    }
  }, [userId]);

  return {
    conversations,
    messages,
    currentConversation,
    activeConversation,
    isLoading,
    isLoadingMessages,
    isSearching,
    searchResults,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage: handleSendMessage,
    createRoom: chatService.createRoom,
    markMessagesAsRead: async (messageIds: string[], userId: string) => {
      await chatService.markMessagesAsRead(messageIds, userId);
    },
    setActiveConversation,
    searchUsers,
    startDirectMessage,
  };
}
