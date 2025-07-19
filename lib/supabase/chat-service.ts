import { Conversation, ChatMessage } from '@/types/chat';
import { supabase } from './client';

// Define the shape of the message with user data from the database
interface MessageWithUser {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  room_id: string;
  is_read: boolean;
  media_urls: string[] | null;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}



// Define the expected shape of the room data from the RPC call
interface RoomData {
  id: string;
  name: string | null;
  is_group: boolean;
  created_at: string;
  updated_at: string;
  participants: Array<{
    id: string;
    username: string;
    avatar_url: string | null;
  }>;
  last_message?: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    user: {
      id: string;
      username: string;
      avatar_url: string | null;
    };
  };
  unread_count: number;
}

// Message and profile types used in the chat service

// Define the database types
type Database = {
  public: {
    Tables: {
      chat_rooms: {
        Row: {
          id: string;
          name: string | null;
          is_group: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          content: string;
          created_at: string;
          sender_id: string;
          room_id: string;
          is_read: boolean;
          media_urls: string[] | null;
        };
        Insert: {
          id?: string;
          content: string;
          created_at?: string;
          sender_id: string;
          room_id: string;
          is_read?: boolean;
          media_urls?: string[] | null;
        };
        Update: {
          id?: string;
          content?: string;
          created_at?: string;
          sender_id?: string;
          room_id?: string;
          is_read?: boolean;
          media_urls?: string[] | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
        };
      };
    };
    Functions: {
      get_user_chat_rooms: {
        Args: { user_id: string };
        Returns: Array<RoomData>;
      };
    };
  };
};

type Tables = Database['public']['Tables'];
type ChatMessagesTable = Tables['chat_messages']['Row'];
type ProfilesTable = Tables['profiles']['Row'];

// Type for message with user data from the database
type DatabaseMessageWithUser = ChatMessagesTable & {
  user: Pick<ProfilesTable, 'id' | 'username' | 'avatar_url'>;
};

export type { DatabaseMessageWithUser };

const chatService = {
  // Search for users by username or email
  // Debug function to check profiles table
  debugProfilesTable: async () => {
    try {
      console.log('Debug: Checking profiles table...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);
      
      if (error) {
        console.error('Error fetching profiles:', error);
        return [];
      }
      
      console.log('First 5 profiles in database:', data);
      return data;
    } catch (error) {
      console.error('Error in debugProfilesTable:', error);
      return [];
    }
  },

  async searchUsers(query: string, currentUserId: string): Promise<Array<{
    id: string;
    username: string;
    avatar_url: string | null;
    email: string;
  }>> {
    console.log('DEBUG: Starting searchUsers with query:', query, 'currentUserId:', currentUserId);
    
    try {
      // First, let's just get all profiles to see what we're working with
      console.log('DEBUG: Fetching all profiles...');
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);
      
      console.log('DEBUG: First 5 profiles in database:', allProfiles);
      
      if (allError) {
        console.error('DEBUG: Error fetching all profiles:', allError);
        return [];
      }

      if (!allProfiles || allProfiles.length === 0) {
        console.log('DEBUG: No profiles found in the database');
        return [];
      }

      // If we have profiles, try a simple search
      const searchTerm = `%${query.trim()}%`;
      console.log('DEBUG: Search term:', searchTerm);

      // Try a direct SQL query for more control
      console.log('DEBUG: Trying direct SQL query...');
      const { data: searchResults, error: searchError } = await supabase.rpc('search_profiles', {
        search_term: searchTerm,
        current_user_id: currentUserId
      });

      console.log('DEBUG: Search results from RPC:', { searchResults, searchError });

      if (searchError) {
        console.error('DEBUG: Error in search profiles RPC:', searchError);
        return [];
      }

      // Format results with fallback for usernames
      const formattedResults = (searchResults || []).map((profile: { id: string; username: string | null; email: string; avatar_url: string | null }) => ({
        id: profile.id,
        username: profile.username || profile.email.split('@')[0],
        email: profile.email,
        avatar_url: profile.avatar_url
      }));

      
      console.log('DEBUG: Returning formatted results:', formattedResults);
      return formattedResults;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  },

  // Create or get existing direct message conversation
  async createDirectMessage(currentUserId: string, otherUserId: string): Promise<Conversation> {
    try {
      // Check if a direct message already exists between these users
      const { data: existingRoom, error: existingError } = await supabase
        .rpc('get_direct_message_room', {
          p_user_id1: currentUserId,
          p_user_id2: otherUserId
        });

      if (existingError) throw existingError;
      
      if (existingRoom && existingRoom.length > 0) {
        // Return existing conversation
        const room = existingRoom[0];
        return {
          id: room.id,
          name: room.name,
          is_group: room.is_group,
          created_at: room.created_at,
          updated_at: room.updated_at,
          participants: room.participants || [],
          // Omit last_message if not needed
          unread_count: 0
        } as Conversation;
      }

      // Create new direct message conversation
      const newRoom = await this.createRoom([currentUserId, otherUserId], false);
      return {
        id: newRoom.id,
        name: newRoom.name,
        is_group: false,
        created_at: newRoom.created_at,
        updated_at: newRoom.updated_at,
        participants: newRoom.participants || [],
        // Omit last_message for new conversations
        unread_count: 0
      } as Conversation;
    } catch (error) {
      console.error('Error creating direct message:', error);
      throw error;
    }
  },


  // Fetch user's conversations with last message
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      // 1. Get all rooms where the user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from('chat_participants')
        .select('room_id')
        .eq('user_id', userId)
        .is('left_at', null);

      if (participantError) throw participantError;
      if (!participantData?.length) return [];

      const roomIds = participantData.map(p => p.room_id);

      // 2. Get room details
      const { data: rooms, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .in('id', roomIds)
        .is('deleted_at', null);

      if (roomsError) throw roomsError;
      if (!rooms?.length) return [];

      // 3. For each room, get participants and last message
      const roomsWithDetails = await Promise.all(rooms.map(async (room) => {
        // Get participants
        const { data: participantsData } = await supabase
          .from('chat_participants')
          .select('user_id, profiles!inner(id, username, avatar_url)')
          .eq('room_id', room.id)
          .is('left_at', null);

        const participants = [];
        for (const p of participantsData || []) {
          participants.push({
            id: p.user_id,
            username: 'User ' + p.user_id.substring(0, 6),
            avatar_url: null
          });
        }

        // Get last message
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('*, profiles!inner(id, username, avatar_url)')
          .eq('room_id', room.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMessage = messages?.[0] ? {
          id: messages[0].id,
          content: messages[0].content,
          created_at: messages[0].created_at,
          user_id: messages[0].sender_id,
          user: {
            id: messages[0].profiles.id,
            username: messages[0].profiles.username,
            avatar_url: messages[0].profiles.avatar_url,
          }
        } : undefined;

        // Get unread count
        const { count: unreadCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .eq('is_read', false)
          .neq('sender_id', userId)
          .is('deleted_at', null);

        return {
          id: room.id,
          name: room.name,
          is_group: room.is_group,
          created_at: room.created_at,
          updated_at: room.updated_at,
          participants,
          last_message: lastMessage,
          unread_count: unreadCount || 0
        };
      }));

      return roomsWithDetails;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  // Fetch messages for a conversation
  async getMessages(roomId: string, page = 1, pageSize = 50): Promise<ChatMessage[]> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        user:profiles!chat_messages_sender_id_fkey (id, username, avatar_url)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    if (!data) return [];

    // Type assertion for the response data
    const messages = data as unknown as MessageWithUser[];

    return messages.map((msg): ChatMessage => ({
      id: msg.id,
      content: msg.content,
      created_at: msg.created_at,
      user_id: msg.sender_id,
      room_id: msg.room_id,
      is_read: msg.is_read,
      media_urls: msg.media_urls || [],
      user: {
        id: msg.user.id,
        username: msg.user.username,
        avatar_url: msg.user.avatar_url,
      },
    }));
  },

  // Send a new message
  async sendMessage(roomId: string, senderId: string, content: string, mediaUrls: string[] = []): Promise<ChatMessage | null> {
    // First insert the message
    const { data: insertedMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: senderId,
        content,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        is_read: false,
      })
      .select()
      .single<{ id: string }>();

    if (insertError) throw insertError;
    if (!insertedMessage) return null;

    // Then fetch the full message with user data
    const { data: fullMessage, error: fetchError } = await supabase
      .from('chat_messages')
      .select(`
        *,
        user:profiles!chat_messages_sender_id_fkey (id, username, avatar_url)
      `)
      .eq('id', insertedMessage.id)
      .single<MessageWithUser>();

    if (fetchError) throw fetchError;
    if (!fullMessage) return null;

    // Update the room's updated_at timestamp
    await supabase
      .from('chat_rooms')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', roomId);

    // Map the response to the ChatMessage type
    return {
      id: fullMessage.id,
      content: fullMessage.content,
      created_at: fullMessage.created_at,
      user_id: fullMessage.sender_id,
      room_id: fullMessage.room_id,
      is_read: fullMessage.is_read,
      media_urls: fullMessage.media_urls || [],
      user: {
        id: fullMessage.user.id,
        username: fullMessage.user.username,
        avatar_url: fullMessage.user.avatar_url,
      },
    };
  },

  // Create a new chat room (direct message or group)
  async createRoom(userIds: string[], isGroup: boolean = false, name?: string) {
    const { data, error } = await supabase.rpc('create_chat_room', {
      p_user_ids: userIds,
      p_is_group: isGroup,
      p_name: name || null
    });

    if (error) throw error;
    return data;
  },

  // Mark messages as read
  async markMessagesAsRead(messageIds: string[], userId: string) {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .in('id', messageIds)
      .eq('is_read', false)
      .neq('sender_id', userId);

    if (error) throw error;
    return { success: true };
  },

  // Subscribe to new messages in a room
  subscribeToNewMessages(roomId: string, callback: (message: ChatMessage) => void) {
    const subscription = supabase
      .channel('public:chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const newMessage = payload.new as MessageWithUser;
          callback({
            id: newMessage.id,
            content: newMessage.content,
            created_at: newMessage.created_at,
            user_id: newMessage.sender_id,
            room_id: newMessage.room_id,
            is_read: newMessage.is_read,
            media_urls: newMessage.media_urls || [],
            user: {
              id: newMessage.user.id,
              username: newMessage.user.username,
              avatar_url: newMessage.user.avatar_url
            }
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
};

// Export as a named export to match the import in use-chat.ts
export { chatService };
// Also export as default for backward compatibility
export default chatService;
