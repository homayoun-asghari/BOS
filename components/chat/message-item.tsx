'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/types/chat';

interface MessageItemProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  className?: string;
}

export function MessageItem({ message, isCurrentUser, className }: MessageItemProps) {
  // Log detailed message info for debugging
  console.log('[MessageItem] Raw message data:', JSON.stringify({
    message: {
      ...message,
      // Don't include the full content to avoid cluttering logs
      content: message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content,
      user: message.user ? {
        id: message.user.id,
        username: message.user.username,
        display_name: message.user.display_name,
        hasAvatar: !!message.user.avatar_url,
        rawUser: message.user
      } : null
    },
    isCurrentUser,
    hasUserObject: !!message.user,
    hasUserId: !!message.user_id,
    hasDisplayName: !!message.user?.display_name
  }, null, 2));
  
  // Ensure we have a valid user object with required fields
  const user = {
    id: message.user?.id || message.user_id || 'unknown',
    username: message.user?.username || 'Unknown',
    display_name: message.user?.display_name || undefined,
    avatar_url: message.user?.avatar_url || null
  };

  // Format the timestamp
  const formattedTime = message.created_at 
    ? new Date(message.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Just now';
    
  console.log('Rendering message from user:', {
    id: user.id,
    username: user.username,
    isCurrentUser,
    content: message.content
  });
  
  if (isCurrentUser) {
    return (
      <div className={cn('flex w-full justify-end', className)}>
        <div className="flex flex-col max-w-[85%] gap-1">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-none px-4 py-2">
            <div className="whitespace-pre-wrap break-words text-sm">{message.content}</div>
            <div className="text-xs text-primary-foreground/80 text-right mt-1">
              {formattedTime}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex w-full', className)}>
      <div className="flex items-start gap-2 max-w-[85%]">
        <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
          <AvatarImage src={user.avatar_url || ''} alt={user.display_name || user.username} />
          <AvatarFallback className="text-xs">
            {(() => {
              const name = user.display_name || user.username;
              const nameParts = name.trim().split(/\s+/);
              if (nameParts.length >= 2) {
                return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
              }
              return name.substring(0, 2).toUpperCase();
            })()}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <div className="font-medium text-xs text-muted-foreground">
            {user.display_name || user.username}
          </div>
          <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-2">
            <div className="whitespace-pre-wrap break-words text-sm">{message.content}</div>
            <div className="text-xs text-muted-foreground text-right mt-1">
              {formattedTime}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
