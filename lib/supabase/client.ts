import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

declare global {
  interface Window {
    __SUPABASE_DEBUGGING__?: boolean;
  }
}

// Create a single instance of the client with optimized configuration
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      // Disable debug mode to reduce console noise
      debug: false,
      // Optimized storage implementation
      storage: {
        getItem: (key) => {
          try {
            if (typeof window === 'undefined') return null;
            return localStorage.getItem(key);
          } catch (error) {
            console.error('Error accessing localStorage:', error);
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            if (typeof window === 'undefined') return;
            localStorage.setItem(key, value);
          } catch (error) {
            console.error('Error setting localStorage:', error);
          }
        },
        removeItem: (key) => {
          try {
            if (typeof window === 'undefined') return;
            localStorage.removeItem(key);
          } catch (error) {
            console.error('Error removing from localStorage:', error);
          }
        }
      }
    }
  }
);

// Only enable auth state change logging in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Only set up the listener once
  if (!window.__SUPABASE_DEBUGGING__) {
    window.__SUPABASE_DEBUGGING__ = true;
    
    // Throttle the auth state change logging
    let lastLogTime = 0;
    const THROTTLE_TIME = 1000; // 1 second
    
    supabase.auth.onAuthStateChange((event, session) => {
      const now = Date.now();
      if (now - lastLogTime > THROTTLE_TIME) {
        console.log('[Auth State Changed]:', {
          event,
          hasSession: !!session,
          userId: session?.user?.id?.substring(0, 8) + '...',
          timestamp: new Date().toISOString()
        });
        lastLogTime = now;
      }
    });
  }
}

// Re-export types
export type { Database };