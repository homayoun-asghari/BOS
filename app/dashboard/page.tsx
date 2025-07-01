"use client";

import { Button } from "@/components/ui/button";
import { 
  LogOut, 
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
import { Settings as SettingsIcon } from 'lucide-react';
import { SettingsModal } from "@/components/settings/settings-modal";
import { HelpModal } from "@/components/help/help-modal";
import { TheCode } from "@/components/dashboard/TheCode";

export default function DashboardPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-16 flex items-center px-4">
          {/* The Code Component */}
          <TheCode />

          {/* User Menu */}
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
                <DropdownMenuItem 
                  className="w-full cursor-pointer"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="w-full cursor-pointer"
                  onClick={() => setIsHelpOpen(true)}
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
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Empty space that pushes the button down */}
        <div className="flex-1"></div>
        
        {/* Fixed bottom container */}
        <div className="sticky bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm">
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <Button size="lg" className="w-full py-6 text-lg font-medium">
                Start
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
        user={user} 
      />
      
      {/* Help Modal */}
      <HelpModal 
        open={isHelpOpen}
        onOpenChange={setIsHelpOpen}
      />


    </div>
  );
}
