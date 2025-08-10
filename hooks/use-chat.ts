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
  const [activeConversation, _setActiveConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const subscriptionRef = useRef<(() => void) | null>(null);
  const initialMount = useRef(true);


  // Get current conversation details
  const currentConversation = useMemo<Conversation | null>(() => {
    console.log('[useChat] Finding current conversation:', { 
      activeConversation, 
      conversationIds: conversations.map(c => c.id) 
    });
    
    if (!activeConversation) {
      console.log('[useChat] No active conversation');
      return null;
    }
    
    const found = conversations.find(c => c.id === activeConversation) || null;
    console.log('[useChat] Found conversation:', found ? found.id : 'not found');
    return found;
  }, [activeConversation, conversations]);
  
  // Log when active conversation changes
  useEffect(() => {
    console.log('[useChat] Active conversation updated:', {
      activeConversation,
      hasCurrentConversation: !!currentConversation,
      conversationCount: conversations.length
    });
  }, [activeConversation, currentConversation, conversations]);

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

  // Set active conversation with proper state management and message loading
  const setActiveConversation = useCallback((conversationId: string | null) => {
    console.log('[useChat] setActiveConversation called with:', conversationId);
    
    // Only update if the conversation is actually changing
    if (conversationId === activeConversation) {
      console.log('[useChat] Conversation already active, skipping update');
      return;
    }
    
    // Update the active conversation state
    _setActiveConversation(conversationId);
    
    // Clear messages when changing conversations
    console.log('[useChat] Clearing messages for conversation change');
    setMessages([]);
    
    // If we have a conversation ID, load its messages
    if (conversationId) {
      console.log('[useChat] Loading messages for conversation:', conversationId);
      fetchMessages(conversationId).then(messages => {
        console.log(`[useChat] Successfully loaded ${messages.length} messages for conversation ${conversationId}`);
      }).catch(error => {
        console.error(`[useChat] Failed to load messages for conversation ${conversationId}:`, error);
      });
    } else {
      console.log('[useChat] No conversation ID provided, messages cleared');
    }
  }, [activeConversation, fetchMessages]);

  // Fetch user's conversations
  const fetchConversations = useCallback(async (): Promise<Conversation[]> => {
    if (!userId) return [];
    
    console.log('Fetching conversations...');
    setIsLoading(true);
    setError(null);
    
    try {
      const userConversations = await chatService.getConversations(userId);
      setConversations(userConversations);
      
      // If there's a pending conversation ID in localStorage, set it as active
      const pendingConversationId = localStorage.getItem('pendingConversationId');
      if (pendingConversationId) {
        const exists = userConversations.some(conv => conv.id === pendingConversationId);
        if (exists) {
          _setActiveConversation(pendingConversationId);
          localStorage.removeItem('pendingConversationId');
        }
      }
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
  }, [userId]);

  // Initial fetch of conversations when component mounts or userId changes
  useEffect(() => {
    if (!userId) return;
    
    // Only fetch on initial mount or when userId changes
    if (initialMount.current || userId) {
      if (initialMount.current) {
        initialMount.current = false;
      }
      fetchConversations();
    }
  }, [userId, fetchConversations]); // Added fetchConversations to dependencies



  // Send a message handler
  const handleSendMessage = useCallback(async (content: string, mediaUrls: string[] = []): Promise<ChatMessage | null> => {
    if (!activeConversation || !userId) return null;
    
    console.log('Sending message to conversation:', activeConversation);
    
    try {
      console.log('Calling chatService.sendMessage with:', { 
        roomId: activeConversation, 
        userId, 
        content, 
        mediaUrls 
      });
      
      const newMessage = await chatService.sendMessage(activeConversation, userId, content, mediaUrls);
      console.log('Received new message from service:', newMessage);
      
      if (!newMessage) {
        console.error('No message returned from chatService.sendMessage');
        return null;
      }
      
      // Validate the message has required fields
      if (!newMessage.id || !newMessage.created_at) {
        console.error('Invalid message format received:', newMessage);
        throw new Error('Invalid message format received from server');
      }
      
      // Update messages list - add new message to the end
      setMessages(prev => {
        const newMessages = [...prev, newMessage];
        console.log('Updated messages list:', newMessages);
        return newMessages;
      });
      
      // Update last message in conversations list
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.id !== activeConversation) return conv;
          
          const updatedConv = {
            ...conv,
            last_message: {
              id: newMessage.id,
              content: newMessage.content,
              created_at: newMessage.created_at,
              user_id: newMessage.user_id || userId,
              user: newMessage.user || {
                id: userId,
                username: user?.username || 'You',
                avatar_url: user?.avatar_url || null
              }
            },
            updated_at: newMessage.created_at || new Date().toISOString()
          };
          
          console.log('Updated conversation:', updatedConv);
          return updatedConv;
        });
        
        console.log('Updated conversations list:', updated);
        return updated;
      });
      
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
      
      // Add the new message to the current conversation's messages - add to the end
      if (activeConversation === newMessage.room_id) {
        setMessages(prev => [...prev, newMessage]);
        
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
    console.log('[useChat] startDirectMessage called with otherUserId:', otherUserId);
    if (!userId) {
      console.log('[useChat] No userId, returning null');
      return null;
    }
    
    try {
      console.log('[useChat] Creating direct message with chatService');
      const conversation = await chatService.createDirectMessage(userId, otherUserId);
      console.log('[useChat] chatService.createDirectMessage returned:', conversation);
      
      if (!conversation) {
        console.error('[useChat] No conversation returned from chatService');
        return null;
      }
      
      // Add to conversations if not already there
      console.log('[useChat] Updating conversations state');
      setConversations(prev => {
        const exists = prev.some(c => c.id === conversation.id);
        console.log(`[useChat] Conversation ${conversation.id} exists in state:`, exists);
        const updated = exists ? prev : [conversation, ...prev];
        console.log('[useChat] Updated conversations:', updated);
        return updated;
      });
      
      // Set the active conversation
      console.log('[useChat] Setting active conversation to:', conversation.id);
      setActiveConversation(conversation.id);
      
      console.log('[useChat] startDirectMessage completed successfully');
      return conversation;
    } catch (error) {
      console.error('[useChat] Error in startDirectMessage:', error);
      setError(error as Error);
      return null;
    }
  }, [userId, setActiveConversation]);

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
