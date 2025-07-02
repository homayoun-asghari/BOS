"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen } from 'lucide-react';

type SidebarItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
};

export function Sidebar() {
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
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex w-64 flex-col">
          <div className="flex h-0 flex-1 flex-col border-r border-border">
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

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center p-2 text-xs ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span className="mb-1">{item.icon}</span>
              <span className="text-xs">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}