'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Get the current user session
    const getSession = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (session?.user) {
          // Get the full user data including user_metadata
          const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
          
          if (userError) throw userError;
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error getting user session:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch user session'));
      } finally {
        setLoading(false);
      }
    };

    // Call immediately
    getSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    // Cleanup
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { user, loading, error };
}

export function useSignOut() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signOut = async () => {
    try {
      setLoading(true);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err instanceof Error ? err : new Error('Failed to sign out'));
    } finally {
      setLoading(false);
    }
  };

  return { signOut, loading, error };
}
