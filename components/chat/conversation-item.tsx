'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types/chat';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
  onClick: () => void;
  className?: string;
}

export function ConversationItem({
  conversation,
  isActive,
  currentUserId,
  onClick,
  className,
}: ConversationItemProps) {
  // Get the other participant in direct messages
  const otherParticipant = conversation.participants.find(
    (p) => p.id !== currentUserId
  );

  const displayName = conversation.is_group
    ? conversation.name
    : otherParticipant?.username || 'Unknown';

  const avatarUrl = conversation.is_group
    ? conversation.media_urls?.[0]
    : otherParticipant?.avatar_url;

  const lastMessage = conversation.last_message?.content
    ? conversation.last_message.content.length > 30
      ? `${conversation.last_message.content.substring(0, 30)}...`
      : conversation.last_message.content
    : 'No messages yet';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 w-full text-left rounded-lg transition-colors',
        isActive
          ? 'bg-accent/50'
          : 'hover:bg-accent/30',
        className
      )}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={avatarUrl || ''} alt={displayName} />
        <AvatarFallback>
          {displayName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <h3 className="font-medium truncate">{displayName}</h3>
          {conversation.last_message?.created_at && (
            <span className="text-xs text-muted-foreground">
              {new Date(conversation.last_message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{lastMessage}</p>
      </div>
    </button>
  );
}
