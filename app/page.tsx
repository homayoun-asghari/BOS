'use client';

import { AnimatedHero } from "@/components/animated/AnimatedHero";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  return (
    <>
      <AnimatedHero />
      <div className="fixed top-6 left-6 z-50">
        <Logo />
      </div>
      <div className="fixed bottom-6 right-6 z-[60]">
        <ThemeToggle />
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/20">
        <footer className="w-full py-3 bg-background/60 backdrop-blur-sm">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center">
            <div className="text-xs text-muted-foreground/60 mb-2 sm:mb-0">
              © {new Date().getFullYear()} BOS. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="text-xs text-muted-foreground/60 hover:text-muted-foreground">
                Terms
              </Link>
              <Link href="/privacy" className="text-xs text-muted-foreground/60 hover:text-muted-foreground">
                Privacy
              </Link>
              <Link href="/help" className="text-xs text-muted-foreground/60 hover:text-muted-foreground">
                Help
              </Link>
              <Link href="/about" className="text-xs text-muted-foreground/60 hover:text-muted-foreground">
                About
              </Link>
              <Link href="/contact" className="text-xs text-muted-foreground/60 hover:text-muted-foreground">
                Contact
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

function Logo() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return <div className="w-12 h-12" />;
  
  const logoSrc = resolvedTheme === 'dark'
    ? '/logo-dark/apple-touch-icon.png'
    : '/logo-light/apple-touch-icon.png';
  
  return (
    <div className="w-12 h-12 relative">
      <Image 
        src={logoSrc}
        alt="BOS Logo"
        fill
        sizes="48px"
        priority
        className="object-contain"
      />
    </div>
  );
}


