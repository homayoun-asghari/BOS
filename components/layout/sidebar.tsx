'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, Book, Users } from 'lucide-react';

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
    {
      name: 'Journal',
      href: '/journal',
      icon: <Book className="h-5 w-5" />,
    },
  ];

  return (
    <>
      {/* Desktop Sidebar - Hidden on medium screens, shown on large screens */}
      <div className={`hidden lg:block group fixed left-4 top-1/2 -translate-y-1/2 z-50 transition-all duration-300 hover:w-48 ${className || ''}`}>
        <div className="bg-background/80 backdrop-blur-lg rounded-2xl p-2 shadow-lg border border-border/50 transition-all duration-300 group-hover:px-4">
          <nav className="flex flex-col space-y-1">
            {items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={`desktop-${item.name}`}
                  href={item.href}
                  className={`flex items-center p-2 rounded-xl transition-all duration-300 overflow-hidden ${
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-foreground/60 hover:bg-foreground/5 hover:text-foreground/90'
                  } justify-center group-hover:justify-start group-hover:pr-4`}
                >
                  <div className="flex items-center justify-center w-8 h-8">
                    <div className="h-5 w-5 transition-transform duration-300 group-hover:scale-110">
                      {item.icon}
                    </div>
                  </div>
                  <span className={`whitespace-nowrap text-sm font-medium transition-all duration-300 ml-0 group-hover:ml-3 w-0 overflow-hidden group-hover:w-auto opacity-0 group-hover:opacity-100 ${
                    isActive ? 'opacity-100' : ''
                  }`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Navigation - Shown on medium and small screens */}
      <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[18rem] md:w-[22rem]">
        <div className="bg-background/80 backdrop-blur-lg rounded-2xl p-2 shadow-lg border border-border/50 w-full">
          <nav className="flex items-center justify-between">
            {items.map((item) => (
              <Link
                key={`mobile-${item.name}`}
                href={item.href}
                className={`p-2 rounded-xl transition-colors duration-200 ${
                  pathname === item.href 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-foreground/60 hover:bg-foreground/5 hover:text-foreground/90'
                }`}
              >
                <div className="h-6 w-6 flex items-center justify-center">
                  {item.icon}
                </div>
              </Link>
            ))}
            <Link
              href="/right-panel"
              className={`p-2 rounded-xl transition-colors duration-200 ${
                pathname === '/right-panel'
                  ? 'bg-primary/10 text-primary' 
                  : 'text-foreground/60 hover:bg-foreground/5 hover:text-foreground/90'
              }`}
              aria-label="Community"
            >
              <div className="h-6 w-6 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}
