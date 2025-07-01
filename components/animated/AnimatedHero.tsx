'use client';

import { Button } from "@/components/ui/button";
import { motion, Variants } from "framer-motion";
import { useEffect, useState } from "react";

import { AuthModal } from "@/components/auth/AuthModal";

export function AnimatedHero() {
  const [mounted, setMounted] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20,
      },
    },
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden bg-gradient-to-b from-background to-muted/10">
      <motion.div 
        className="w-full max-w-[95vw] mx-auto"
        variants={container}
        initial="hidden"
        animate={mounted ? "show" : "hidden"}
      >
        <motion.h1 
          className="text-[7.5vw] font-bold tracking-tight text-center whitespace-nowrap font-sans"
          variants={item}
        >
          <span className="bg-gradient-to-r from-foreground via-primary/90 to-foreground bg-clip-text text-transparent bg-300% animate-gradient">
            Brain Operating System
          </span>
        </motion.h1>
      </motion.div>
      
      <motion.div 
        className="mt-16 group"
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: mounted ? 1 : 0, 
          y: mounted ? 0 : 20,
          transition: { 
            delay: 0.8,
            type: "spring",
            stiffness: 100,
            damping: 15
          } 
        }}
      >
        <Button 
          size="lg" 
          className="text-2xl px-10 py-7 rounded-full bg-foreground text-background hover:bg-primary hover:scale-105 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 transform-gpu group-hover:rotate-1"
          onClick={() => setIsAuthModalOpen(true)}
        >
          <span className="relative">
            <span className="absolute inset-0 bg-gradient-to-r from-primary to-foreground opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300"></span>
            <span className="relative z-10">Become!</span>
          </span>
        </Button>
      </motion.div>
      
      <AuthModal open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
      
      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 8s ease infinite;
          background-size: 200% 200%;
          background-image: linear-gradient(to right, #3B444B, #FEFEFA);
        }
      `}</style>
    </div>
  );
}
