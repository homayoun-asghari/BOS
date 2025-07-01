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
  User as UserIcon
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

export default function DashboardPage() {
  const [isOpen, setIsOpen] = useState(false);

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
                <AvatarImage src="/placeholder-user.jpg" alt="User" />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <UserIcon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">John Doe</p>
                <p className="text-xs leading-none text-muted-foreground flex items-center">
                  <Mail className="h-3 w-3 mr-1" />
                  john@example.com
                </p>
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
              <button className="w-full cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
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
