import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ChatMessage, Conversation } from '@/types/chat';
import { useAuth } from '@/components/auth/AuthProvider';
import { dummyRooms, dummyUsers, dummyMessages, dummyParticipants, currentUser } from '@/lib/chatData';

type DummyMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
};

export function useChat() {
  const { user } = useAuth();
  const userId = user?.id;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    console.log('Initial messages state set');
    return [];
  });
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<Error | null>(null);


  // Get current conversation details
  const currentConversation = useMemo<Conversation | null>(() => {
    if (!activeConversation) return null;
    return conversations.find(c => c.id === activeConversation) || null;
  }, [activeConversation, conversations]);

  // Use dummy data for development
  const useDummyData = useMemo(
    () => true, // Always use dummy data for now
    []
  );
  
  console.log('useDummyData:', useDummyData);

  // Memoize the dummy data processing to prevent recreation
  const processDummyConversations = useCallback(() => {
    if (!useDummyData) return [];
    
    console.log('Processing dummy conversations');
    
    // Get the most recent message for each room
    const roomMessages = new Map<string, DummyMessage>();
    dummyMessages.forEach((msg: DummyMessage) => {
      const existing = roomMessages.get(msg.room_id);
      if (!existing || new Date(existing.created_at) < new Date(msg.created_at)) {
        roomMessages.set(msg.room_id, msg);
      }
    });
    
    return dummyRooms.map(room => {
      // Get participants for this room
      const participants = dummyParticipants
        .filter((p: { room_id: string }) => p.room_id === room.id)
        .map((p: { user_id: string }) => {
          const user = dummyUsers.find(u => u.id === p.user_id) || currentUser;
          return {
            username: user.username,
            avatar_url: user.avatar_url
          };
        });
        
      // Get the last message for this room
      const lastMessage = roomMessages.get(room.id);
      
      return {
        ...room,
        participants,
        last_message: lastMessage ? {
          content: lastMessage.content || '',
          created_at: lastMessage.created_at || new Date().toISOString()
        } : undefined
      } as Conversation;
    });
  }, [useDummyData]);

  // Fetch user's conversations
  const fetchConversations = useCallback(async (): Promise<Conversation[]> => {
    if (isLoading) return conversations; // Prevent concurrent fetches
    
    console.log('Fetching conversations...');
    setIsLoading(true);
    setError(null);
    
    try {
      if (useDummyData) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const userConversations = processDummyConversations();
        setConversations(userConversations);
        return userConversations;
      } else if (userId) {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .contains('participant_ids', [userId])
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        
        const conversations = (data || []) as Conversation[];
        setConversations(conversations);
        return conversations;
      }
      return [];
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
  }, [userId, useDummyData, supabase, isLoading, conversations, processDummyConversations]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      console.log('No conversation ID provided, skipping message fetch');
      return;
    }
    
    console.log('=== STARTING MESSAGE FETCH ===');
    console.log('Conversation ID:', conversationId);
    
    // Process dummy messages function (moved inside to prevent recreation)
    const processDummyMessages = (roomId: string): ChatMessage[] => {
      console.log('Processing dummy messages for room:', roomId);
      const roomMessages = dummyMessages.filter((msg: DummyMessage) => msg.room_id === roomId);
      
      // Create a mapping of user IDs to user objects
      const userMap = new Map(dummyUsers.map(u => [u.id, u]));
      
      return roomMessages.map(msg => {
        const sender = userMap.get(msg.sender_id) || {
          id: msg.sender_id,
          username: 'Unknown',
          avatar_url: null
        };
        
        return {
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          updated_at: msg.created_at,
          user_id: sender.id,
          room_id: msg.room_id,
          user: {
            id: sender.id,
            username: sender.username,
            avatar_url: sender.avatar_url || null
          },
          is_read: msg.is_read
        };
      }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    };
    
    console.log('\n=== FETCHING MESSAGES ===');
    console.log('Conversation ID:', conversationId);
    console.log('Using dummy data:', useDummyData);
    
    setIsLoadingMessages(true);
    setError(null);
    
    try {
      if (useDummyData) {
        console.log('\n=== USING DUMMY DATA ===');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const messages = processDummyMessages(conversationId);
        console.log('Setting messages state with:', {
          count: messages.length,
          messages: messages.map(m => ({
            id: m.id,
            content: m.content,
            user_id: m.user_id,
            username: m.user?.username || 'Unknown'
          }))
        });
        
        setMessages(messages);
      } else {
        console.log('\n=== FETCHING FROM SUPABASE ===');
        const { data, error: fetchError } = await supabase
          .from('chat_messages')
          .select(`
            *,
            user:profiles(username, avatar_url)
          `)
          .eq('room_id', conversationId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;
        
        console.log('Fetched messages from supabase:', data);
        setMessages(data || []);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err : new Error('Failed to load messages'));
    } finally {
      console.log('=== MESSAGE FETCH COMPLETE ===\n');
      setIsLoadingMessages(false);
    }
  }, [useDummyData, supabase]); // Removed currentUser as it's a constant

  // Send a new message
  const sendMessage = useCallback(async (content: string) => {
    if (!activeConversation || !userId || !content.trim()) return;
    
    // Get user metadata
    const username = user?.user_metadata?.name || 'You';
    const avatarUrl = user?.user_metadata?.avatar_url || null;
    const now = new Date().toISOString();
    
    // Create a new message object for optimistic update
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      content: content.trim(),
      user_id: userId,
      room_id: activeConversation,
      created_at: now,
      is_read: false,
      user: {
        id: userId,
        username: username,
        avatar_url: avatarUrl
      }
    };
    
    // Optimistic update
    setMessages(prev => [...prev, newMessage]);
    
    // Update the conversation's last message
    setConversations(prev => 
      prev.map(conv => 
        conv.id === activeConversation
          ? {
              ...conv,
              last_message: {
                content: content.trim(),
                created_at: now
              },
              updated_at: now
            }
          : conv
      )
    );
    
    if (useDummyData) {
      // In dummy data mode, we've already updated the UI optimistically
      // Add the message to our dummy data for consistency
      dummyMessages.push({
        id: newMessage.id,
        room_id: activeConversation,
        sender_id: userId,
        content: content.trim(),
        created_at: now,
        is_read: false
      });
      return newMessage;
    }
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([
          {
            room_id: activeConversation,
            sender_id: userId,
            content: content.trim(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      
      // Update the messages list
      setMessages((prev) => [...prev, data as ChatMessage]);
      
      // Update the conversation's last message
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversation
            ? {
                ...conv,
                last_message: {
                  content: content.trim(),
                  created_at: new Date().toISOString(),
                },
                updated_at: new Date().toISOString(),
              }
            : conv
        )
      );
      
      return data;
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err : new Error('Failed to send message'));
      throw err;
    }
  }, [activeConversation, userId, supabase, useDummyData, user?.user_metadata?.name, user?.user_metadata?.avatar_url]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!activeConversation) return;
    
    const channel = supabase
      .channel(`room:${activeConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${activeConversation}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMessage]);
          
          // Update the conversation's last message
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === activeConversation
                ? {
                    ...conv,
                    last_message: {
                      content: newMessage.content,
                      created_at: newMessage.created_at,
                    },
                    updated_at: newMessage.created_at,
                  }
                : conv
            )
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeConversation, supabase]);

  // Load conversations on mount and when userId changes
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        console.log('Initial conversations load...');
        await fetchConversations();
        if (isMounted) {
          console.log('Conversations loaded successfully');
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    };
    
    // Only load if we don't have conversations yet
    if (conversations.length === 0) {
      loadData();
    }
    
    return () => {
      isMounted = false;
    };
  }, [fetchConversations, conversations.length]);

  // Load messages when active conversation changes
  useEffect(() => {
    let isMounted = true;
    
    const loadMessages = async () => {
      if (!activeConversation) {
        console.log('No active conversation, clearing messages');
        if (isMounted) {
          setMessages([]);
        }
        return;
      }
      
      console.log('Active conversation changed, loading messages for:', activeConversation);
      
      try {
        await fetchMessages(activeConversation);
        if (isMounted) {
          console.log('Messages loaded for conversation:', activeConversation);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };
    
    // Use a small timeout to prevent rapid state updates
    const timer = setTimeout(loadMessages, 50);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeConversation, fetchMessages]);

  return {
    conversations,
    messages,
    currentConversation,
    isLoading,
    isLoadingMessages,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
    setActiveConversation,
  };
}
