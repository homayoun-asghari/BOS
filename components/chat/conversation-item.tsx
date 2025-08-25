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
  console.log('[ConversationItem] Props:', {
    conversation: {
      id: conversation.id,
      is_group: conversation.is_group,
      name: conversation.name,
      participants: conversation.participants?.map(p => ({
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        hasAvatar: !!p.avatar_url
      })),
      last_message: conversation.last_message ? {
        id: conversation.last_message.id,
        content: conversation.last_message.content,
        created_at: conversation.last_message.created_at,
        user_id: conversation.last_message.user_id
      } : null,
      media_urls: conversation.media_urls
    },
    isActive,
    currentUserId,
    className
  });
  
  const handleClick = (e: React.MouseEvent) => {
    console.log(`[ConversationItem] Clicked on conversation ${conversation.id}`);
    e.stopPropagation();
    onClick();
  };
  // Get the other participant in direct messages
  const otherParticipant = conversation.participants?.find(
    (p) => p.id !== currentUserId
  ) || null;

  const displayName = conversation.is_group && conversation.name
    ? conversation.name
    : otherParticipant?.display_name || otherParticipant?.username || 'Unknown';

  const avatarUrl = conversation.is_group
    ? conversation.media_urls?.[0] || undefined
    : otherParticipant?.avatar_url || undefined;
    
  const avatarFallback = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const unreadCount = conversation.unread_count || 0;
  const hasUnread = unreadCount > 0;

  const lastMessage = conversation.last_message?.content
    ? conversation.last_message.content.length > 30
      ? `${conversation.last_message.content.substring(0, 30)}...`
      : conversation.last_message.content
    : 'No messages yet';

  console.log(`[ConversationItem] Derived data for conversation ${conversation.id}:`, {
    displayName,
    avatarUrl,
    avatarFallback,
    lastMessage,
    otherParticipant: otherParticipant ? {
      id: otherParticipant.id,
      username: otherParticipant.username,
      display_name: otherParticipant.display_name,
      hasAvatar: !!otherParticipant.avatar_url
    } : null
  });

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-3 p-3 w-full text-left rounded-lg transition-colors',
        isActive
          ? 'bg-accent/50'
          : hasUnread
            ? 'bg-accent/20 hover:bg-accent/30'
            : 'hover:bg-accent/30',
        className
      )}
    >
      <Avatar className="h-10 w-10 border border-background/50 shadow-sm">
        <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
        <AvatarFallback className="bg-foreground/5 text-foreground/80 text-sm font-medium">
          {avatarFallback}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <h3 className={cn('truncate', hasUnread ? 'font-semibold' : 'font-medium')}>{displayName}</h3>
        </div>
        <div className="flex items-center justify-between w-full gap-2">
          <p className={cn('text-sm truncate max-w-[70%]', hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground')}>{lastMessage}</p>
          <div className="flex items-center gap-2 shrink-0">
            {conversation.last_message?.created_at && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(conversation.last_message.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
            {hasUnread && !isActive && (
              <span className="ml-1 inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
