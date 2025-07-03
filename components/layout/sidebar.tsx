'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen } from 'lucide-react';

type SidebarItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
};

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  
  const items: SidebarItem[] = [
    {
      name: 'Roadmap',
      href: '/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: 'Knowledge',
      href: '/knowledge',
      icon: <BookOpen className="h-5 w-5" />,
    },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex md:flex-shrink-0 ${className || ''}`}>
        <div className="flex w-64 flex-col border-r border-border">
          <div className="flex h-0 flex-1 flex-col">
            <div className="flex flex-1 flex-col overflow-y-auto pt-5">
              <div className="flex-1 space-y-1 px-3">
                {items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                      }`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Floating Capsule */}
      <div className="fixed z-50 w-full max-w-xs -translate-x-1/2 bg-background/95 backdrop-blur-sm border border-border rounded-full bottom-4 left-1/2 dark:bg-card/80 shadow-lg md:hidden">
        <div className="grid h-16 grid-cols-2 mx-auto">
          {items.map((item, index) => {
            const isActive = pathname === item.href;
            const isFirst = index === 0;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`inline-flex flex-col items-center justify-center hover:bg-accent/30 transition-colors duration-200 ${
                  isFirst ? 'rounded-l-full' : 'rounded-r-full'
                } ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <span className="h-5 w-5 flex items-center justify-center">
                  {item.icon}
                </span>
                <span className="text-[10px] mt-0.5">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
