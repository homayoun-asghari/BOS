import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { ChatMessage, Conversation } from '@/types/chat';
import { useAuth } from '@/components/auth/AuthProvider';
import { chatService } from '@/lib/supabase/chat-service';
import { supabase } from '@/lib/supabase/client';

// Minimal shape for chat_messages rows used in realtime callbacks
type ChatMessagesRow = {
  id: string;
  room_id: string;
  content: string;
  created_at: string;
  sender_id: string;
};

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
  markMessagesAsRead: (roomId: string, userId: string) => Promise<void>;
  deleteConversation: (roomId: string) => Promise<void>;
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

  // Helper to keep conversations sorted by most recent activity
  const sortConversations = useCallback((arr: Conversation[]) => {
    return [...arr].sort((a, b) => {
      const aTime = Date.parse((a.last_message?.created_at as string) || a.updated_at);
      const bTime = Date.parse((b.last_message?.created_at as string) || b.updated_at);
      return bTime - aTime;
    });
  }, []);


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
    if (!userId) return [];
    
    console.log('Fetching messages for conversation:', conversationId);
    setIsLoadingMessages(true);
    setError(null);
    
    try {
      const conversationMessages = await chatService.getMessages(conversationId, userId);
      setMessages(conversationMessages);
      // Mark all as read for this room upon fetching while viewing
      await chatService.markMessagesAsRead(conversationId, userId);
      // Reflect read state in conversations to clear any badge
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c));
      return conversationMessages;
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err : new Error('Failed to load messages'));
      return [];
    } finally {
      setIsLoadingMessages(false);
    }
  }, [isLoadingMessages, userId]);

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
    
    // Fetch conversations for the current user
    setIsLoading(true);
    setError(null);
    
    try {
      const userConversations = await chatService.getConversations(userId);
      setConversations(sortConversations(userConversations));
      
      // If there's a pending conversation ID in localStorage, set it as active (client only)
      if (typeof window !== 'undefined') {
        const pendingConversationId = window.localStorage.getItem('pendingConversationId');
        if (pendingConversationId) {
          const exists = userConversations.some(conv => conv.id === pendingConversationId);
          if (exists) {
            _setActiveConversation(pendingConversationId);
            window.localStorage.removeItem('pendingConversationId');
          }
        }
      }
      return userConversations;
    } catch (err) {
      const error = err as Error & { details?: string; hint?: string; code?: string };
      setError(error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [userId, sortConversations]);

  // Realtime: update conversation list items when any new message arrives (any room)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`conv-list-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload: RealtimePostgresChangesPayload<ChatMessagesRow>) => {
          const m = payload.new as ChatMessagesRow;
          if (!m) return;

          setConversations(prev => {
            // Only update if we already know this room
            const exists = prev.some(c => c.id === m.room_id);
            if (!exists) return prev;
            const updated = prev.map(c => {
              if (c.id !== m.room_id) return c;
              const isActiveRoom = c.id === activeConversation;
              const fromSelf = m.sender_id === userId;
              return {
                ...c,
                last_message: {
                  id: m.id,
                  content: m.content,
                  created_at: m.created_at,
                  user_id: m.sender_id,
                },
                updated_at: m.created_at,
                unread_count: isActiveRoom || fromSelf ? 0 : (c.unread_count || 0) + 1,
              } as Conversation;
            });
            return sortConversations(updated);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeConversation, sortConversations]);

  // Initial fetch of conversations when component mounts or userId changes
  useEffect(() => {
    if (!userId) return;
    if (initialMount.current) {
      initialMount.current = false;
    }
    fetchConversations();
  }, [userId, fetchConversations]);

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
        return sortConversations(updated);
      });
      
      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error : new Error('Failed to send message'));
      return null;
    }
  }, [activeConversation, userId, user?.username, user?.avatar_url, sortConversations]);

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
          chatService.markMessagesAsRead(activeConversation, userId);
        }
      }
      
      // Update the last message in the conversations list and resort
      setConversations(prev => {
        const updated = prev.map(room => {
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
        });
        return sortConversations(updated);
      });
    };

    const handleUpdatedMessage = (updatedMessage: ChatMessage) => {
      // Update the message in-place if it's part of the active conversation
      if (activeConversation === updatedMessage.room_id) {
        setMessages(prev => prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m));
      }

      // If the updated message is the last message for the room, reflect the change in conversations
      setConversations(prev => {
        const mapped = prev.map(room => {
          if (room.id !== updatedMessage.room_id) return room;
          if (!room.last_message || room.last_message.id !== updatedMessage.id) return room;
          return {
            ...room,
            last_message: {
              ...room.last_message,
              content: updatedMessage.content,
              created_at: updatedMessage.created_at,
              user_id: updatedMessage.user_id
            },
            updated_at: updatedMessage.updated_at || room.updated_at,
          };
        });
        return sortConversations(mapped);
      });
    };
    
    // Set up the message subscription
    const unsubscribeMessages = chatService.subscribeToNewMessages(activeConversation, userId, {
      onInsert: handleNewMessage,
      onUpdate: handleUpdatedMessage,
    });
    
    // Subscribe to read-receipt updates and update messages in-place when others read
    const unsubscribeReceipts = chatService.subscribeToReadReceipts(activeConversation, ({ user_id, last_read_at }) => {
      if (!userId || user_id === userId || !last_read_at) return; // ignore own updates
      const lastReadMs = new Date(last_read_at).getTime();
      const participants: { id: string }[] = (currentConversation?.participants as { id: string }[]) || [];
      setMessages(prev => prev.map(m => {
        // Do not count reader's own messages
        if (m.user_id === user_id) return m;
        const msgMs = new Date(m.created_at).getTime();
        if (msgMs > lastReadMs) return m;
        const seenSet = new Set(m.seen_by_user_ids || []);
        if (seenSet.has(user_id)) return m;
        seenSet.add(user_id);
        const totalOthers = participants.filter((p) => p.id !== m.user_id).length;
        const newSeenCount = seenSet.size;
        const seen_by_all = totalOthers > 0 ? newSeenCount === totalOthers : false;
        return {
          ...m,
          seen_by_user_ids: Array.from(seenSet),
          seen_by_count: newSeenCount,
          seen_by_all,
        };
      }));
    });

    // Polling fallback to ensure near-realtime seen updates even if Realtime is limited by RLS
    const pollInterval = setInterval(async () => {
      try {
        const states = await chatService.getParticipantsReadState(activeConversation);
        const participants: { id: string }[] = (currentConversation?.participants as { id: string }[]) || [];
        setMessages(prev => {
          let changed = false;
          let next = prev;
          for (const { user_id, last_read_at } of states) {
            if (!last_read_at || user_id === userId) continue;
            const lastReadMs = new Date(last_read_at).getTime();
            const updated = next.map(m => {
              if (m.user_id === user_id) return m; // don't mark reader's own messages
              const msgMs = new Date(m.created_at).getTime();
              if (msgMs > lastReadMs) return m;
              const seenSet = new Set(m.seen_by_user_ids || []);
              if (seenSet.has(user_id)) return m;
              seenSet.add(user_id);
              const totalOthers = participants.filter((p) => p.id !== m.user_id).length;
              const newSeenCount = seenSet.size;
              const seen_by_all = totalOthers > 0 ? newSeenCount === totalOthers : false;
              changed = true;
              return { ...m, seen_by_user_ids: Array.from(seenSet), seen_by_count: newSeenCount, seen_by_all };
            });
            next = updated;
          }
          return changed ? next : prev;
        });
      } catch {}
    }, 2000);
    
    // Store a combined unsubscribe function in the ref
    subscriptionRef.current = () => {
      unsubscribeMessages();
      unsubscribeReceipts();
    };
    
    // Clean up on unmount or when conversation changes
    return () => {
      clearInterval(pollInterval);
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, [activeConversation, userId, fetchMessages, currentConversation?.participants, sortConversations]);

  // Load conversations on mount and when userId changes
  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      
      try {
        const conversations = await chatService.getConversations(userId);
        setConversations(sortConversations(conversations));
      } catch (error) {
        console.error('Failed to load conversations:', error);
        setError(error instanceof Error ? error : new Error('Failed to load conversations'));
      }
    };
    
    loadData();
  }, [userId, sortConversations]);

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
        return sortConversations(updated);
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
  }, [userId, setActiveConversation, sortConversations]);

  // Delete/leave a conversation for the current user
  const deleteConversation = useCallback(async (roomId: string) => {
    if (!roomId) return;
    try {
      await chatService.leaveConversation(roomId);
      setConversations(prev => prev.filter(c => c.id !== roomId));
      if (activeConversation === roomId) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('[useChat] Failed to delete conversation:', err);
      setError(err as Error);
    }
  }, [activeConversation, setActiveConversation]);

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
    markMessagesAsRead: async (roomId: string, userId: string) => {
      await chatService.markMessagesAsRead(roomId, userId);
    },
    setActiveConversation,
    searchUsers,
    startDirectMessage,
    deleteConversation,
  };
}
