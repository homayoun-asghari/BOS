"use client";

import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  LogOut, 
  Settings, 
  HelpCircle, 
  Zap,
  ChevronRight,
  Mail,
  Loader2
} from "lucide-react";
import { useState } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { signOut } from "@/lib/auth";
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [signOutLoading, setSignOutLoading] = useState(false);

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

  const userInitial = user?.email?.[0]?.toUpperCase() || 'U';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const userAvatar = user?.user_metadata?.avatar_url || '';

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <header className="flex justify-end items-center mb-12">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-accent transition-colors"
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8">
                {userAvatar ? (
                  <AvatarImage src={userAvatar} alt={userName} />
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
                {userLoading ? (
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
              <Link href="/settings" className="w-full cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/help" className="w-full cursor-pointer">
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Help & Support</span>
              </Link>
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
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        {/* Dropdown */}
        <div className="relative mb-12">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between p-4 border border-border rounded-lg text-left hover:border-ring/50 transition-colors bg-background"
          >
            <span className="text-muted-foreground">Select an option</span>
            <ChevronDown className={`h-5 w-5 text-muted-foreground/80 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg">
              <div className="p-2 hover:bg-accent cursor-pointer text-foreground">Option 1</div>
              <div className="p-2 hover:bg-accent cursor-pointer text-foreground">Option 2</div>
              <div className="p-2 hover:bg-accent cursor-pointer text-foreground">Option 3</div>
            </div>
          )}
        </div>

        {/* Centered Button */}
        <div className="flex justify-center">
          <Button size="lg" className="px-8 py-6 text-lg font-medium">
            Action Button
          </Button>
        </div>
      </div>
    </div>
  );
}
