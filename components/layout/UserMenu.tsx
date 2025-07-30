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
  Zap,
  Mail,
  Loader2,
  Settings as SettingsIcon
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
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
  onOpenChange?: (open: boolean) => void;
  onOpenSettings: () => void;

}

export function UserMenu({ user, loading, onOpenChange, onOpenSettings }: UserMenuProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { signOut } = useAuth();

  const userInitial = user?.email?.[0]?.toUpperCase() || 'U';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const userAvatar = user?.user_metadata?.avatar_url || '';

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push('/');
      router.refresh(); // Ensure the page refreshes to update auth state
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="ml-4 flex-shrink-0">
      <DropdownMenu onOpenChange={onOpenChange}>
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
        <DropdownMenuContent className="w-64 bg-background border-border shadow-lg" align="end">
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
          <DropdownMenuItem asChild>
            <button 
              className="w-full cursor-pointer flex items-center"
              onClick={(e) => {
                e.preventDefault();
                onOpenSettings();
              }}
            >
              <SettingsIcon className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </button>
          </DropdownMenuItem>
          {/* Temporarily disabled Help & Support
          <DropdownMenuItem asChild>
            <button 
              className="w-full cursor-pointer flex items-center"
              onClick={(e) => {
                e.preventDefault();
                onOpenHelp();
              }}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Help & Support</span>
            </button>
          </DropdownMenuItem>
          */}
          <DropdownMenuItem className="opacity-50 cursor-not-allowed" onClick={(e) => e.preventDefault()}>
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center">
                <Zap className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Upgrade Plan</span>
              </div>
              <span className="text-xs text-muted-foreground">Coming Soon</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <button 
              className="w-full cursor-pointer flex items-center hover:bg-accent"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Logging out...</span>
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </>
              )}
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
