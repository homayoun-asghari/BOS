"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  LogOut, 
  HelpCircle, 
  Zap,
  ChevronRight,
  Mail,
  Loader2,
  Settings as SettingsIcon
} from "lucide-react";
import { signOut } from "@/lib/auth";
import Link from "next/link";

interface UserMenuProps {
  user: {
    email?: string | null;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  } | null;
  loading: boolean;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

export function UserMenu({ user, loading, onOpenSettings, onOpenHelp }: UserMenuProps) {
  const router = useRouter();
  const [signOutLoading, setSignOutLoading] = useState(false);
  
  const userInitial = user?.email?.[0]?.toUpperCase() || 'U';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const userAvatar = user?.user_metadata?.avatar_url || '';

  const handleSignOut = async () => {
    try {
      setSignOutLoading(true);
      await signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setSignOutLoading(false);
    }
  };

  return (
    <div className="ml-4 flex-shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full hover:bg-accent transition-colors p-1">
            <Avatar className="h-8 w-8 border border-border">
              {userAvatar ? (
                <>
                  <AvatarImage src={userAvatar} alt={userName} className="object-cover" />
                  <AvatarFallback className="bg-background text-foreground">
                    {userInitial}
                  </AvatarFallback>
                </>
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary">
                  {userInitial}
                </AvatarFallback>
              )}
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  {userEmail && (
                    <p className="text-xs leading-none text-muted-foreground flex items-center">
                      <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{userEmail}</span>
                    </p>
                  )}
                </>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="w-full cursor-pointer"
            onClick={onOpenSettings}
          >
            <SettingsIcon className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="w-full cursor-pointer"
            onClick={onOpenHelp}
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help & Support</span>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/upgrade" className="w-full cursor-pointer">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <Zap className="mr-2 h-4 w-4 text-yellow-500" />
                  <span>Upgrade Plan</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <button 
              className="w-full cursor-pointer flex items-center"
              onClick={(e) => {
                e.preventDefault();
                handleSignOut();
              }}
              disabled={signOutLoading}
            >
              {signOutLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </>
              )}
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
