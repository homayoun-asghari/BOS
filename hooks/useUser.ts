'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
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
  }, []); // No dependencies needed as supabase.auth is stable

  useEffect(() => {
    // Initial fetch
    fetchUser();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          await fetchUser();
        }
      }
    );

    // Cleanup
    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchUser]);

  return { user, loading, error };
}
