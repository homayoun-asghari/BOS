import { Conversation, ChatMessage } from '@/types/chat';
import { supabase } from '@/lib/supabase/client';

// Type for message with user data from the database

// Type for message with user data from the database
interface DatabaseMessageWithUser {
  id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  sender_id: string;
  room_id: string;
  is_read: boolean;
  deleted_at?: string | null;
  media_urls?: string[] | null;
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null; // Make profiles nullable to match the actual response
}

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

  // Leave (delete) a conversation for the current user
  async leaveConversation(roomId: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      if (!currentUserId) throw new Error('No active session');

      const { error } = await supabase
        .from('chat_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', currentUserId);
      if (error) throw error;

      // Optional cleanup could be added here to archive/delete empty rooms
    } catch (error) {
      console.error('[leaveConversation] Error leaving conversation:', error);
      throw error;
    }
  },

  // Lightweight helper to fetch participants' read state
  async getParticipantsReadState(roomId: string): Promise<{ user_id: string; last_read_at: string | null }[]> {
    const { data, error } = await supabase
      .from('chat_participants')
      .select('user_id, last_read_at, left_at')
      .eq('room_id', roomId);
    if (error) throw error;
    const rows = (data ?? []) as Array<{ user_id: string; last_read_at: string | null; left_at: string | null }>;
    return rows
      .filter((p) => p.left_at === null)
      .map(({ user_id, last_read_at }) => ({ user_id, last_read_at }));
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
    console.log('[chatService] createDirectMessage called with:', { currentUserId, otherUserId });
    
    try {
      // Check if a direct message already exists between these users
      console.log('[chatService] Checking for existing direct message room');
      const { data: existingRoom, error: existingError } = await supabase
        .rpc('get_direct_message_room', {
          p_user_id1: currentUserId,
          p_user_id2: otherUserId
        });

      if (existingError) {
        console.error('[chatService] Error checking for existing room:', existingError);
        throw existingError;
      }
      
      if (existingRoom && existingRoom.length > 0) {
        // Return existing conversation
        const room = existingRoom[0];
        console.log('[chatService] Found existing room:', room.id);
        const conversation = {
          id: room.id,
          name: room.name,
          is_group: room.is_group,
          created_at: room.created_at,
          updated_at: room.updated_at,
          participants: (room.participants || []).map((p: { id: string; username: string; display_name?: string; avatar_url: string | null }) => ({
            id: p.id,
            username: p.username,
            ...(p.display_name ? { display_name: p.display_name } : {}),
            avatar_url: p.avatar_url || null
          })),
          unread_count: 0
        } as Conversation;
        console.log('[chatService] Returning existing conversation:', conversation);
        return conversation;
      }

      console.log('[chatService] No existing room found, creating new one');
      // Create new direct message conversation
      const newRoom = await this.createRoom([currentUserId, otherUserId], false);
      console.log('[chatService] Created new room:', newRoom);
      
      const conversation = {
        id: newRoom.id,
        name: newRoom.name,
        is_group: false,
        created_at: newRoom.created_at,
        updated_at: newRoom.updated_at,
        participants: newRoom.participants || [],
        unread_count: 0
      } as Conversation;
      
      console.log('[chatService] Returning new conversation:', conversation);
      return conversation;
    } catch (error) {
      console.error('Error creating direct message:', error);
      throw error;
    }
  },


  // Fetch user's conversations with last message
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      console.log('[getConversations] Fetching conversations for user:', userId);
      
      // 1. Get all rooms where the user is a participant
      console.log('[getConversations] Fetching chat participants for user:', userId);
      const { data: participantData, error: participantError } = await supabase
        .from('chat_participants')
        .select('room_id, user_id')
        .eq('user_id', userId)
        .is('left_at', null);

      if (participantError) {
        console.error('Error fetching participant data:', participantError);
        throw participantError;
      }
      
      if (!participantData?.length) {
        console.log('[getConversations] No active conversations found for user');
        return [];
      }

      const roomIds = participantData.map(p => p.room_id);
      console.log('[getConversations] Found room IDs:', roomIds);
      
      // Log the raw participant data
      console.log('[getConversations] Raw participant data:', JSON.stringify(participantData, null, 2));

      // 2. Get room details
      const { data: rooms, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .in('id', roomIds);

      if (roomsError) {
        console.error('Error fetching room details:', roomsError);
        throw roomsError;
      }
      
      if (!rooms?.length) {
        console.log('[getConversations] No room details found for the given room IDs');
        return [];
      }

      // 3. For each room, get participants and last message
      const roomsWithDetails = await Promise.all(rooms.map(async (room) => {
        try {
          // Validate required fields before creating conversation object
          if (!room?.id || !room?.created_at || !room?.updated_at) {
            console.warn('Skipping room with missing required fields:', room);
            return null;
          }
          
          console.log(`[getConversations] Processing room ${room.id}`);
          
          // Get all participants for this room with their profile data
          console.log(`[getConversations] Fetching participants for room ${room.id}`);
          // First, get all participant user IDs
          const { data: participantIds, error: participantIdsError } = await supabase
            .from('chat_participants')
            .select('user_id, left_at')
            .eq('room_id', room.id)
            .is('left_at', null);
            
          if (participantIdsError) {
            console.error(`Error fetching participant IDs for room ${room.id}:`, participantIdsError);
            return null;
          }
          
          if (!participantIds?.length) {
            console.warn(`Room ${room.id} has no active participants`);
            return null;
          }
          
          console.log(`[getConversations] Found ${participantIds.length} participants for room ${room.id}:`, 
            participantIds.map(p => p.user_id));
          
          // Then fetch all participant profiles in a single query
          const userIds = participantIds.map(p => p.user_id);
          const { data: participantProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', userIds);
            
          if (profilesError) {
            console.error(`Error fetching participant profiles for room ${room.id}:`, profilesError);
            return null;
          }
          
          // Create a map of user ID to profile for easier lookup
          const profileMap = new Map(participantProfiles?.map(p => [p.id, p]) || []);
          
          console.log(`[getConversations] Found ${participantProfiles?.length || 0} participant profiles`);
          console.log('[getConversations] Profile map:', Object.fromEntries(profileMap));
          
          // Build participants array with profile data
          const participants = participantIds
            .map(p => {
              const profile = profileMap.get(p.user_id);
              if (!profile) {
                console.warn(`[getConversations] No profile found for user ID: ${p.user_id}`);
                return null;
              }
              
              const participant = {
                id: p.user_id,
                username: profile.username || 'Unknown',
                display_name: profile.display_name || null,
                avatar_url: profile.avatar_url || null
              };
              
              console.log(`[getConversations] Mapped participant ${p.user_id}:`, participant);
              return participant;
            })
            .filter((p): p is { id: string; username: string; display_name: string | null; avatar_url: string | null } => p !== null);
          
          console.log(`[getConversations] Room ${room.id} participants:`, participants);
          
          // Ensure participants array exists and has at least one participant
          if (!participants.length) {
            console.warn(`Skipping room ${room.id} with no valid participants`);
            return null;
          }

          // Get the last message for this room
          let lastMessage = undefined;
          try {
            const { data: lastMessages, error: lastMessageError } = await supabase
              .from('chat_messages')
              .select('id, content, created_at, sender_id')
              .eq('room_id', room.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (lastMessageError && lastMessageError.code !== 'PGRST116') {
              console.error(`Error fetching last message for room ${room.id}:`, lastMessageError);
            } else if (lastMessages) {
              lastMessage = {
                id: lastMessages.id,
                content: lastMessages.content,
                created_at: lastMessages.created_at,
                user_id: lastMessages.sender_id
              };
            }
          } catch (error) {
            console.error(`Error processing last message for room ${room.id}:`, error);
          }
          try {
            const { data: lastMessages, error: lastMessageError } = await supabase
              .from('chat_messages')
              .select('id, content, created_at, sender_id')
              .eq('room_id', room.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (lastMessageError && lastMessageError.code !== 'PGRST116') { // PGRST116 is "No rows returned"
              console.error(`Error fetching last message for room ${room.id}:`, lastMessageError);
              // Don't return null here, continue without the last message
            } else if (lastMessages) {
              lastMessage = {
                id: lastMessages.id,
                content: lastMessages.content,
                created_at: lastMessages.created_at,
                user_id: lastMessages.sender_id
              };
            }
          } catch (error) {
            console.error(`Error processing last message for room ${room.id}:`, error);
            // Continue without the last message
          }

          // Get unread count
          let unreadCount = 0;
          try {
            // Determine user's last_read_at for this room
            const { data: viewerRow, error: viewerErr } = await supabase
              .from('chat_participants')
              .select('last_read_at')
              .eq('room_id', room.id)
              .eq('user_id', userId)
              .single();
            if (viewerErr) throw viewerErr;

            const lastReadAt = viewerRow?.last_read_at as string | null;

            // Count messages from others that are newer than last_read_at
            let query = supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id)
              .neq('sender_id', userId);
            if (lastReadAt) {
              query = query.gt('created_at', lastReadAt);
            }

            const { count, error: countErr } = await query;
            if (countErr) throw countErr;
            unreadCount = count || 0;
          } catch (error) {
            console.error(`Error fetching unread count for room ${room.id}:`, error);
            // Default to 0 if we can't get the unread count
          }

          // Ensure participants have the correct type with optional display_name
          const typedParticipants = participants.map(p => ({
            id: p.id,
            username: p.username,
            display_name: p.display_name ?? undefined, // Convert null to undefined
            avatar_url: p.avatar_url
          }));

          const conversation: Conversation = {
            id: room.id,
            name: room.name,
            is_group: room.is_group,
            created_at: room.created_at,
            updated_at: room.updated_at,
            participants: typedParticipants,
            unread_count: unreadCount
          };
          
          // Only add last_message if it exists
          if (lastMessage) {
            conversation.last_message = lastMessage;
          }
          
          console.log(`[getConversations] Processed room ${room.id}:`, conversation);
          return conversation;
          
        } catch (error) {
          console.error(`Error processing room ${room?.id}:`, error);
          return null;
        }
      }));
      
      // Filter out any null values and ensure type safety
      const validConversations = roomsWithDetails.filter((room): room is Conversation => room !== null);
      // Sort newest first based on last message time or updated_at
      const sortedConversations = [...validConversations].sort((a, b) => {
        const aTime = Date.parse((a.last_message?.created_at as string) || a.updated_at);
        const bTime = Date.parse((b.last_message?.created_at as string) || b.updated_at);
        return bTime - aTime;
      });
      console.log(`[getConversations] Found ${validConversations.length} valid conversations`);
      return sortedConversations;
      
    } catch (error) {
      console.error('Error in getConversations:', error);
      throw error;
    }
  },

  // Fetch messages for a conversation
  async getMessages(roomId: string, userId: string, page = 1, pageSize = 50): Promise<ChatMessage[]> {
    console.log(`[getMessages] Fetching messages for room ${roomId}, user ${userId}, page ${page}, pageSize ${pageSize}`);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Fetch IDs of messages hidden by this user (per-user hides)
    console.log('[getMessages] Fetching hidden message IDs for user');
    const { data: hiddenRows, error: hiddenError } = await supabase
      .from('chat_message_deletions')
      .select('message_id')
      .eq('user_id', userId);

    if (hiddenError) {
      console.error('[getMessages] Error fetching hidden message IDs:', hiddenError);
    }
    const hiddenIds = new Set((hiddenRows || []).map((r: { message_id: string }) => r.message_id));

    console.log('[getMessages] Building supabase query...');
    const query = supabase
      .from('chat_messages')
      .select(`
        *,
        profiles:profiles!chat_messages_sender_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .range(from, to);

    console.log('[getMessages] Executing query...');
    const { data, error } = await query;

    if (error) {
      console.error('[getMessages] Error fetching messages:', error);
      throw error;
    }

    console.log(`[getMessages] Query successful, got ${data?.length || 0} messages`);
    if (!data || data.length === 0) {
      console.log('[getMessages] No messages found');
      return [];
    }

    console.log('[getMessages] Raw data from supabase:', JSON.stringify(data, null, 2));

    // Fetch participants' last_read_at for seen computation
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participants')
      .select('user_id, last_read_at, left_at')
      .eq('room_id', roomId);
    if (participantsError) {
      console.warn('[getMessages] Could not fetch participants for seen computation:', participantsError);
    }
    const activeParticipants = (participants || []).filter(p => p.left_at === null);

    const messages = data.map((msg: DatabaseMessageWithUser) => {
      console.log(`[getMessages] Processing message ${msg.id}, sender_id: ${msg.sender_id}`);
      console.log(`[getMessages] Sender data:`, JSON.stringify(msg.profiles, null, 2));
      
      const sender = msg.profiles || { id: msg.sender_id, username: 'Unknown', display_name: undefined, avatar_url: null };
      // Compute seen_by for this message based on participants' last_read_at
      const msgCreatedAt = new Date(msg.created_at).getTime();
      const seenByUserIds: string[] = (activeParticipants || [])
        .filter(p => p.user_id !== msg.sender_id && p.last_read_at && new Date(p.last_read_at).getTime() >= msgCreatedAt)
        .map(p => p.user_id as string);
      const seenByCount = seenByUserIds.length;
      const totalOthersForMsg = (activeParticipants || []).filter(p => p.user_id !== msg.sender_id).length;
      const seenByAll = totalOthersForMsg > 0 ? seenByCount === totalOthersForMsg : false;

      const mappedMsg: ChatMessage = {
        id: msg.id,
        content: msg.content,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        user_id: msg.sender_id,
        room_id: msg.room_id,
        is_read: msg.is_read,
        deleted_at: msg.deleted_at || null,
        media_urls: msg.media_urls || [],
        // Only add seen fields for the viewer's benefit (still present on all for simplicity)
        seen_by_user_ids: seenByUserIds,
        seen_by_count: seenByCount,
        seen_by_all: seenByAll,
        user: {
          id: msg.sender_id,
          username: sender.username || 'Unknown',
          display_name: sender.display_name || undefined,
          avatar_url: sender.avatar_url || null
        }
      };
      
      console.log(`[getMessages] Mapped message ${msg.id}:`, JSON.stringify(mappedMsg, null, 2));
      return mappedMsg;
    });

    console.log(`[getMessages] Successfully mapped ${messages.length} messages`);
    // Filter out messages hidden by this user
    const visibleMessages = messages.filter(m => !hiddenIds.has(m.id));
    console.log(`[getMessages] Filtered to ${visibleMessages.length} visible messages after applying hides`);
    
    // Ensure messages are sorted in ascending order by creation time
    // (newest at the bottom)
    return visibleMessages.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  },

  // Send a new message
  async sendMessage(roomId: string, senderId: string, content: string, mediaUrls: string[] = []): Promise<ChatMessage | null> {
    console.log(`[sendMessage] Starting sendMessage for room ${roomId}`);
    console.log(`[sendMessage] Sender: ${senderId}, Content: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`);
    
    try {
      // Get current session
      console.log('[sendMessage] Getting current session...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        const error = new Error('No active session');
        console.error('[sendMessage] Error:', error.message);
        throw error;
      }
      console.log('[sendMessage] Session user ID:', session.user.id);

      console.log('[sendMessage] Sending message to room:', roomId);
      console.log('[sendMessage] Sender ID:', senderId);
      console.log('[sendMessage] Content:', content);
      console.log('[sendMessage] Media URLs:', mediaUrls);

      // Insert message using RPC
      console.log('[sendMessage] Calling insert_chat_message RPC...');
      const { data: messageData, error: insertError } = await supabase.rpc('insert_chat_message', {
        p_room_id: roomId,
        p_content: content,
        p_media_urls: mediaUrls.length > 0 ? mediaUrls : null
      });

      if (insertError) {
        console.error('[sendMessage] Error in insert_chat_message RPC:', insertError);
        throw insertError;
      }
      
      if (!messageData) {
        const error = new Error('No data returned from RPC call');
        console.error('[sendMessage]', error.message);
        throw error;
      }

      console.log('[sendMessage] RPC response:', JSON.stringify(messageData, null, 2));

      // Parse message data
      const message = typeof messageData === 'string' ? JSON.parse(messageData) : messageData;
      console.log('[sendMessage] Parsed message:', message);

      // Update room's updated_at timestamp
      console.log('[sendMessage] Updating room timestamp...');
      const { error: updateError } = await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', roomId);

      if (updateError) {
        console.error('[sendMessage] Error updating room timestamp:', updateError);
      } else {
        console.log('[sendMessage] Room timestamp updated successfully');
      }

      // Format and return the message
      const formattedMessage = {
        id: message.id,
        content: message.content,
        created_at: message.created_at,
        updated_at: message.updated_at,
        user_id: message.sender_id,
        room_id: message.room_id,
        is_read: message.is_read,
        media_urls: message.media_urls || [],
        user: {
          id: message.user?.id || message.sender_id,
          username: message.user?.username || 'Unknown',
          avatar_url: message.user?.avatar_url || null,
        },
      };
      
      console.log('[sendMessage] Formatted message:', JSON.stringify(formattedMessage, null, 2));
      return formattedMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Create a new chat room (direct message or group)
  async createRoom(userIds: string[], isGroup: boolean = false, name?: string): Promise<Conversation> {
    console.log('[chatService] createRoom called with:', { userIds, isGroup, name });
    
    try {
      console.log('[chatService] Calling create_chat_room RPC');
      const { data, error } = await supabase.rpc('create_chat_room', {
        p_user_ids: userIds,
        p_is_group: isGroup,
        p_name: name || null
      });

      if (error) {
        console.error('[chatService] Error in create_chat_room RPC:', error);
        throw error;
      }

      if (!data) throw new Error('No data returned from RPC call');

      // Parse the room data
      const room = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Map the room data to Conversation type
      return {
        id: room.id,
        name: room.name || '',
        is_group: room.is_group,
        created_at: room.created_at,
        updated_at: room.updated_at || room.created_at,
        participants: (room.participants || []).map((p: { id: string; username: string; display_name?: string; avatar_url: string | null }) => ({
          id: p.id,
          username: p.username,
          display_name: p.display_name || null,
          avatar_url: p.avatar_url || null
        })),
        last_message: room.last_message ? {
          id: room.last_message.id,
          content: room.last_message.content,
          created_at: room.last_message.created_at,
          user_id: room.last_message.sender_id,
          // The Conversation type expects these properties directly on last_message
          ...(room.last_message.sender_id && { user_id: room.last_message.sender_id }),
          ...(room.last_message.sender_username && { username: room.last_message.sender_username }),
          ...(room.last_message.sender_display_name && { display_name: room.last_message.sender_display_name }),
          ...(room.last_message.sender_avatar_url && { avatar_url: room.last_message.sender_avatar_url })
        } : undefined,
        unread_count: 0
      };
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  },

  // Mark messages as read
  async markMessagesAsRead(roomId: string, userId: string): Promise<void> {
    // Update the viewer's last_read_at for this room
    const { error } = await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  // Delete a message (for sender only or for everyone)
  async deleteMessage(messageId: string, forEveryone: boolean, originalSenderId?: string): Promise<boolean> {
    try {
      // Ensure user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      if (!currentUserId) throw new Error('No active session');

      // Direct update strategy with simple permission checks
      if (forEveryone) {
        // Only the original sender can delete for everyone
        if (originalSenderId && originalSenderId !== currentUserId) {
          throw new Error('Only the sender can delete this message for everyone');
        }
        // Mark deleted for everyone: blank content and set deleted_at
        const { error } = await supabase
          .from('chat_messages')
          .update({ content: '', deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', messageId)
          .eq('sender_id', currentUserId);
        if (error) throw error;
        return true;
      } else {
        // Delete for sender only (hide from sender): persist in chat_message_deletions
        const { data: inserted, error } = await supabase
          .from('chat_message_deletions')
          .insert({ message_id: messageId, user_id: currentUserId })
          .select('message_id');
        if (error) throw error;
        return Array.isArray(inserted) && inserted.length > 0;
      }
    } catch (error) {
      console.error('[deleteMessage] Error deleting message:', error);
      return false;
    }
  },

  // Subscribe to messages in a room (INSERT and UPDATE)
  // Accepts either a single insert callback or an object with onInsert and onUpdate handlers
  subscribeToNewMessages(
    roomId: string,
    currentUserId: string,
    handlers: ((message: ChatMessage) => void) | { onInsert: (message: ChatMessage) => void; onUpdate?: (message: ChatMessage) => void }
  ): () => void {
    console.log(`[subscribeToNewMessages] Subscribing to messages for room ${roomId}`);

    const onInsert = typeof handlers === 'function' ? handlers : handlers.onInsert;
    const onUpdate = typeof handlers === 'function' ? undefined : handlers.onUpdate;
    
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
        async (payload) => {
          try {
            console.log('[subscribeToNewMessages] New message received:', payload);
            
            // The payload only contains the message data, not the user data
            const newMessage = payload.new as {
              id: string;
              content: string;
              created_at: string;
              updated_at: string | null;
              sender_id: string;
              room_id: string;
              is_read: boolean;
              media_urls: string[] | null;
              deleted_at?: string | null;
            };

            // Skip if this message is hidden for the current user
            const { data: hideRow, error: hideError } = await supabase
              .from('chat_message_deletions')
              .select('message_id')
              .eq('message_id', newMessage.id)
              .eq('user_id', currentUserId)
              .maybeSingle();
            if (!hideError && hideRow) {
              console.log('[subscribeToNewMessages] Message is hidden for current user, skipping emit');
              return;
            }
            
            // Fetch the sender's profile with all required fields
            const { data: senderProfile, error } = await supabase
              .from('profiles')
              .select('id, username, avatar_url, display_name')
              .eq('id', newMessage.sender_id)
              .single<{
                id: string;
                username: string;
                avatar_url: string | null;
                display_name: string | null;
              }>();
            
            if (error) {
              console.error('[subscribeToNewMessages] Error fetching sender profile:', error);
              throw error;
            }
            
            console.log('[subscribeToNewMessages] Sender profile:', senderProfile);
            
            // Create the message object with the sender's profile
            const chatMessage: ChatMessage = {
              id: newMessage.id,
              content: newMessage.content,
              created_at: newMessage.created_at,
              updated_at: newMessage.updated_at || undefined,
              user_id: newMessage.sender_id,
              room_id: newMessage.room_id,
              is_read: newMessage.is_read,
              deleted_at: newMessage.deleted_at || null,
              media_urls: newMessage.media_urls || [],
              user: {
                id: senderProfile.id,
                username: senderProfile.username || 'Unknown',
                ...(senderProfile.display_name && { display_name: senderProfile.display_name }),
                avatar_url: senderProfile.avatar_url
              }
            };
            
            console.log('[subscribeToNewMessages] Emitting message (insert):', chatMessage);
            onInsert(chatMessage);
          } catch (error) {
            console.error('[subscribeToNewMessages] Error processing new message:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          try {
            console.log('[subscribeToNewMessages] Message updated:', payload);
            const updated = payload.new as {
              id: string;
              content: string;
              created_at: string;
              updated_at: string | null;
              sender_id: string;
              room_id: string;
              is_read: boolean;
              media_urls: string[] | null;
              deleted_at?: string | null;
            };

            // If hidden for current user, skip
            const { data: hideRow, error: hideError } = await supabase
              .from('chat_message_deletions')
              .select('message_id')
              .eq('message_id', updated.id)
              .eq('user_id', currentUserId)
              .maybeSingle();
            if (!hideError && hideRow) {
              console.log('[subscribeToNewMessages] Updated message is hidden for current user, skipping emit');
              return;
            }

            // Fetch sender profile
            const { data: senderProfile, error } = await supabase
              .from('profiles')
              .select('id, username, avatar_url, display_name')
              .eq('id', updated.sender_id)
              .single<{
                id: string;
                username: string;
                avatar_url: string | null;
                display_name: string | null;
              }>();
            if (error) {
              console.error('[subscribeToNewMessages] Error fetching sender profile (update):', error);
              throw error;
            }

            const chatMessage: ChatMessage = {
              id: updated.id,
              content: updated.content,
              created_at: updated.created_at,
              updated_at: updated.updated_at || undefined,
              user_id: updated.sender_id,
              room_id: updated.room_id,
              is_read: updated.is_read,
              deleted_at: updated.deleted_at || null,
              media_urls: updated.media_urls || [],
              user: {
                id: senderProfile.id,
                username: senderProfile.username || 'Unknown',
                ...(senderProfile.display_name && { display_name: senderProfile.display_name }),
                avatar_url: senderProfile.avatar_url
              }
            };

            console.log('[subscribeToNewMessages] Emitting updated message:', chatMessage);
            onUpdate?.(chatMessage);
          } catch (error) {
            console.error('[subscribeToNewMessages] Error processing updated message:', error);
          }
        }
      )
      .subscribe();

    return () => {
      console.log(`[subscribeToNewMessages] Unsubscribing from room ${roomId}`);
      subscription.unsubscribe();
    };
  }
  ,

  // Subscribe to read-receipt updates (participants' last_read_at)
  subscribeToReadReceipts(
    roomId: string,
    onUpdate: (payload: { user_id: string; last_read_at: string | null }) => void
  ): () => void {
    const subscription = supabase
      .channel('public:chat_participants')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_participants',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const row = payload.new as { user_id: string; last_read_at: string | null };
          onUpdate({ user_id: row.user_id, last_read_at: row.last_read_at });
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
