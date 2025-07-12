'use client';

import { TheCode } from './TheCode';
import { UserMenu } from './UserMenu';
import { User } from '@supabase/supabase-js';

interface NavbarProps {
  user: User | null;
  userLoading: boolean;
  isCodeAccordionOpen: boolean;
  onCodeAccordionChange: (open: boolean) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  fullWidth?: boolean;
}

export function Navbar({
  user,
  userLoading,
  isCodeAccordionOpen,
  onCodeAccordionChange,
  onOpenSettings,
  onOpenHelp,
  fullWidth = false,
}: NavbarProps) {
  const handleUserMenuOpenChange = (open: boolean) => {
    if (open) {
      onCodeAccordionChange(false);
    }
  };

  return (
    <header className={`sticky top-0 z-30 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${fullWidth ? 'pl-16' : ''}`}>
      <div className={fullWidth ? 'w-full' : 'relative lg:max-w-[calc(100%-375px)]'}>
        <div className={`w-full px-4 md:px-6 transition-all duration-300 ${fullWidth ? '' : 'lg:pl-20 group-has-[.sidebar:hover]:lg:pl-[10rem]'}`}>
          <div className="flex h-16 items-center justify-between">
            <div className="flex-1 flex items-center min-w-0 relative">
              <div className="w-full">
                <TheCode
                  isOpen={isCodeAccordionOpen}
                  onOpenChange={onCodeAccordionChange}
                />
              </div>
            </div>
            <div className="flex items-center">
              <UserMenu
                user={user}
                loading={userLoading}
                onOpenChange={handleUserMenuOpenChange}
                onOpenSettings={onOpenSettings}
                onOpenHelp={onOpenHelp}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
