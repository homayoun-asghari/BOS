'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, Mail, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  email?: string;
  created_at?: string;
}

interface ProfilePopoverProps {
  user: UserProfile;
  children: React.ReactNode;
}

export function ProfilePopover({ user, children }: ProfilePopoverProps) {
  const router = useRouter();
  
  const handleViewProfile = () => {
    const currentPath = window.location.pathname;
    router.push(`${currentPath}?profile=${user.username}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" sideOffset={10}>
        <div className="space-y-4 p-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar_url || ''} alt={user.display_name || user.username} />
              <AvatarFallback className="bg-foreground/5 text-foreground/80 text-2xl font-medium">
                {user.display_name 
                  ? user.display_name
                      .split(' ')
                      .filter((_, i, arr) => i === 0 || i === arr.length - 1)
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                  : user.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h4 className="font-semibold text-lg">{user.display_name || user.username}</h4>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            {user.email && (
              <div className="flex items-center text-muted-foreground">
                <Mail className="mr-2 h-4 w-4" />
                <span>{user.email}</span>
              </div>
            )}
            {user.created_at && (
              <div className="flex items-center text-muted-foreground">
                <Calendar className="mr-2 h-4 w-4" />
                <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          
          <Button 
            variant="outline" 
            className="w-full mt-2"
            onClick={handleViewProfile}
          >
            <UserIcon className="mr-2 h-4 w-4" />
            View Full Profile
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
