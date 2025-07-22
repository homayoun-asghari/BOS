'use client';

import { ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Conversation } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  conversation: Conversation | null;
  currentUserId: string;
  className?: string;
  onBack?: () => void;
}

export function ChatHeader({ conversation, currentUserId, className, onBack }: ChatHeaderProps) {
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

  const displayName = (conversation.is_group && conversation.name)
    ? conversation.name
    : otherParticipant?.display_name || otherParticipant?.username || 'Unknown';

  const avatarUrl = conversation.is_group
    ? conversation.media_urls?.[0] || undefined
    : otherParticipant?.avatar_url || undefined;
    
  const avatarFallback = displayName
    .split(' ')
    .map((n) => n[0] || '')
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <div className={cn('p-4', className)}>
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -ml-2 mr-1"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold">{displayName}</h2>
          {!conversation.is_group && otherParticipant?.username && (
            <p className="text-sm text-muted-foreground">
              @{otherParticipant.username}
            </p>
          )}
          {conversation.is_group && (
            <p className="text-sm text-muted-foreground">
              {conversation.participants.length} participants
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
