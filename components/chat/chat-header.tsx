'use client';

import { ArrowLeft, MoreVertical, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Conversation } from '@/types/chat';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useChatContext } from '@/context/chat-context';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderProps {
  conversation: Conversation | null;
  currentUserId: string;
  className?: string;
  onBack?: () => void;
}

export function ChatHeader({ conversation, currentUserId, className, onBack }: ChatHeaderProps) {
  const router = useRouter();
  const { deleteConversation } = useChatContext();
  
  console.log('[ChatHeader] Props:', {
    conversation: {
      ...conversation,
      participants: conversation?.participants?.map(p => ({
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        hasAvatar: !!p.avatar_url
      }))
    },
    currentUserId,
    className
  });
  console.log('[ChatHeader] Rendering with:', {
    conversationId: conversation?.id,
    currentUserId,
    hasOnBack: !!onBack,
    isGroup: conversation?.is_group
  });
  
  const handleBack = () => {
    console.log('[ChatHeader] Back button clicked');
    onBack?.();
  };

  const handleDeleteConversation = async () => {
    if (!conversation) return;
    const confirmText = conversation.is_group ? 'Leave this group conversation?' : 'Delete this conversation?';
    if (!window.confirm(confirmText)) return;
    try {
      await deleteConversation(conversation.id);
      onBack?.();
    } catch (e) {
      console.error('[ChatHeader] Failed to delete conversation:', e);
    }
  };
  if (!conversation) {
    return (
      <div className={cn('p-4', className)}>
        <h2 className="text-lg font-semibold">Select a conversation</h2>
      </div>
    );
  }

  // For direct messages, show the other participant's info
  const otherParticipant = !conversation.is_group
    ? conversation.participants?.find((p) => p.id !== currentUserId) || null
    : null;

  console.log('[ChatHeader] Conversation data:', {
    conversationId: conversation.id,
    isGroup: conversation.is_group,
    name: conversation.name,
    participants: conversation.participants,
    currentUserId,
    otherParticipant
  });

  const handleProfileClick = () => {
    if (conversation.is_group || !otherParticipant) return;
    const currentPath = window.location.pathname;
    router.push(`${currentPath}?profile=${otherParticipant.username}`);
  };

  return (
    <div className={cn('flex items-center justify-between p-4 border-b', className)}>
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-3">
          {!conversation.is_group && otherParticipant ? (
            <button 
              onClick={handleProfileClick}
              className="flex items-center gap-3 rounded-lg p-1 -m-1 hover:bg-muted transition-colors"
            >
              <Avatar className="h-10 w-10 border border-background/50 shadow-sm">
                <AvatarImage
                  src={otherParticipant.avatar_url || ''}
                  alt={otherParticipant.display_name || otherParticipant.username || 'User'}
                  className="object-cover"
                />
                <AvatarFallback className="bg-foreground/5 text-foreground/80">
                  {otherParticipant.display_name
                    ? otherParticipant.display_name
                        .split(' ')
                        .filter((_, i, arr) => i === 0 || i === arr.length - 1)
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                    : (otherParticipant.username || 'U').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <h2 className="font-medium">
                  {otherParticipant.display_name || otherParticipant.username || 'Unknown User'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  @{otherParticipant.username}
                </p>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-background/50 shadow-sm">
                <AvatarImage
                  src={conversation.is_group ? undefined : otherParticipant?.avatar_url || ''}
                  alt={conversation.is_group ? 'Group' : otherParticipant?.display_name || otherParticipant?.username || 'User'}
                  className="object-cover"
                />
                <AvatarFallback className="bg-foreground/5 text-foreground/80">
                  {conversation.is_group 
                    ? 'G' 
                    : otherParticipant?.display_name
                      ? otherParticipant.display_name
                          .split(' ')
                          .filter((_, i, arr) => i === 0 || i === arr.length - 1)
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                      : (otherParticipant?.username || 'U').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-medium">
                  {conversation.name || 'Group Chat'}
                </h2>
              </div>
            </div>
          )}
        </div>
        {conversation.is_group && (
          <p className="text-sm text-muted-foreground">
            {conversation.participants.length} participants
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={handleDeleteConversation}>
              <Trash2 className="h-4 w-4" />
              Delete conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
