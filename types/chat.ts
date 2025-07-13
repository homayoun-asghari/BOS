import { User } from '@supabase/supabase-js';

export interface ChatParticipant {
  user: {
    id: string;
    username: string;
    avatar_url?: string | null;
  };
}

export interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  room_id: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  is_read?: boolean;
}

export interface Conversation {
  id: string;
  name: string;
  is_group: boolean;
  last_message?: {
    content: string;
    created_at: string;
  };
  participants: Array<{
    id: string;
    username: string;
    avatar_url: string | null;
  }>;
  media_urls?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  className?: string;
}

export interface MessageItemProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  className?: string;
}

export interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: string;
  activeConversation: string | null;
  onSelectConversation: (id: string) => void;
  className?: string;
}

export interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
  onClick: () => void;
  className?: string;
}

export interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export interface ChatHeaderProps {
  conversation: Conversation | null;
  currentUser: User | null;
  className?: string;
}
