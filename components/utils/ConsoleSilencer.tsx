'use client';

import { useEffect } from 'react';

type ConsoleMethods = 'log' | 'warn' | 'info' | 'debug' | 'error';

type ConsoleMethod = (...args: unknown[]) => void;

interface ConsoleStorage {
  [key: string]: ConsoleMethod;
}

export default function ConsoleSilencer() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_LOGS !== 'true') {
      // Save original console methods
      const originalConsole: ConsoleStorage = {};
      const methods: ConsoleMethods[] = ['log', 'warn', 'info', 'debug', 'error'];
      
      methods.forEach(method => {
        originalConsole[method] = console[method].bind(console);
      });
      
      // Override all console methods to be no-ops, except error
      (['log', 'warn', 'info', 'debug'] as ConsoleMethods[]).forEach(method => {
        console[method] = () => {};
      });
      
      // Keep error logging
      console.error = originalConsole.error;
      
      return () => {
        // Restore original console methods
        methods.forEach(method => {
          console[method] = originalConsole[method];
        });
      };
    }
  }, []);

  return null;
}
