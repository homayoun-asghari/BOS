"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown, User } from "lucide-react";
import { useState } from 'react';

export default function DashboardPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <header className="flex justify-end items-center mb-12">
        <button className="p-2 rounded-full hover:bg-accent transition-colors">
          <User className="h-5 w-5 text-muted-foreground" />
        </button>
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
