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
  if (!conversation) {
    return (
      <div className={cn('p-4', className)}>
        <h2 className="text-lg font-semibold">Select a conversation</h2>
      </div>
    );
  }

  // For direct messages, show the other participant's info
  const otherParticipant = !conversation.is_group
    ? conversation.participants.find((p) => p.id !== currentUserId)
    : null;

  const displayName = conversation.is_group
    ? conversation.name
    : otherParticipant?.username || 'Unknown';

  const avatarUrl = conversation.is_group
    ? conversation.media_urls?.[0]
    : otherParticipant?.avatar_url;

  return (
    <div className={cn('p-4', className)}>
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -ml-2 mr-1"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
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
        <div className="flex-1">
          <h2 className="font-semibold">{displayName}</h2>
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
