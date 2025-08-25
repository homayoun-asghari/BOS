'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/types/chat';
import { ProfilePopover } from './profile-popover';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import chatService from '@/lib/supabase/chat-service';

interface MessageItemProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  className?: string;
}

export function MessageItem({ message, isCurrentUser, className }: MessageItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [hiddenForSelf, setHiddenForSelf] = useState(false);
  const [globallyDeletedLocal, setGloballyDeletedLocal] = useState(false);
  // Determine if message has been globally deleted (content blanked or deleted_at set)
  const isGloballyDeleted = useMemo(
    () => globallyDeletedLocal || !!message.deleted_at || message.content.trim() === '',
    [globallyDeletedLocal, message.deleted_at, message.content]
  );
  const bubbleText = isGloballyDeleted ? 'Message deleted' : message.content;
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

  // Status label for current user's messages (must be before any early return to respect Hooks rules)
  const statusLabel = useMemo(() => {
    if (!isCurrentUser) return '';
    if (isGloballyDeleted) return '';
    if (message.seen_by_all) return 'Seen';
    if ((message.seen_by_count || 0) > 0) return 'Seen';
    return 'Sent';
  }, [isCurrentUser, isGloballyDeleted, message.seen_by_all, message.seen_by_count]);

  // If message is hidden locally (delete for me), do not render
  if (hiddenForSelf) {
    return null;
  }

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
  const handleDelete = async (forEveryone: boolean) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const success = await chatService.deleteMessage(message.id, forEveryone, message.user_id);
      if (success) {
        if (forEveryone) {
          setGloballyDeletedLocal(true); // Optimistic UI update
          toast.success('Message deleted for everyone');
        } else {
          // Hide locally since there's no per-user delete flag in DB
          setHiddenForSelf(true);
          toast.success('Message deleted for you');
        }
      } else {
        toast.error('Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('An error occurred while deleting the message');
    } finally {
      setIsDeleting(false);
    }
  };

  // isGloballyDeleted and bubbleText declared above to respect hook rules

  if (isCurrentUser) {
    return (
      <div className={cn('flex w-full justify-end', className)}>
        <div className="flex flex-col max-w-[85%] gap-1 group">
          <div className="relative bg-primary text-primary-foreground rounded-2xl rounded-tr-none px-4 py-2">
            <div className="absolute top-1 right-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Message actions"
                    className="p-0.5 rounded-full hover:bg-primary-foreground/10 disabled:opacity-50"
                    disabled={isDeleting}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[12rem]">
                  <DropdownMenuItem onClick={() => handleDelete(false)} disabled={isDeleting}>
                    Delete for me
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => handleDelete(true)} disabled={isDeleting || isGloballyDeleted}>
                    Delete for everyone
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className={cn('whitespace-pre-wrap break-words text-sm', isGloballyDeleted && 'italic opacity-80')}>
              {bubbleText}
            </div>
            <div className="text-[10px] text-primary-foreground/80 text-right mt-0.5 flex items-center justify-end gap-1">
              <span>{formattedTime}</span>
              {statusLabel && (
                <span className={cn('text-[10px] text-primary-foreground/80')}>{statusLabel}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex w-full', className)}>
      <div className="flex items-start gap-2 max-w-[85%]">
        <ProfilePopover user={{
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          email: undefined, // Add if available
          created_at: undefined // Add if available
        }}>
          <button className="rounded-full hover:ring-2 hover:ring-ring hover:ring-offset-2 transition-all">
            <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5 border border-background/50 shadow-sm">
              <AvatarImage src={user.avatar_url || ''} alt={user.display_name || user.username} className="object-cover" />
              <AvatarFallback className="bg-foreground/5 text-foreground/80 text-xs font-medium">
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
          </button>
        </ProfilePopover>
        <div className="space-y-1 group">
          <div className="font-medium text-xs text-muted-foreground">
            {user.display_name || user.username}
          </div>
          <div className="relative bg-muted rounded-2xl rounded-tl-none px-4 py-2">
            <div className="absolute top-1 left-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Message actions"
                    className="p-0.5 rounded-full hover:bg-foreground/10 disabled:opacity-50"
                    disabled={isDeleting}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[12rem]">
                  <DropdownMenuItem onClick={() => handleDelete(false)} disabled={isDeleting}>
                    Delete for me
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className={cn('whitespace-pre-wrap break-words text-sm', isGloballyDeleted && 'italic opacity-80')}>
              {bubbleText}
            </div>
            <div className="text-[10px] text-muted-foreground text-right mt-0.5">
              {formattedTime}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
