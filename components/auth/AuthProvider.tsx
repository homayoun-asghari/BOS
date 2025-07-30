'use client';

import { createContext, useContext, useEffect, useReducer, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthState {
  user: User | null;
  session: Session | null;
  accessToken: string | null;
  isLoading: boolean;
  error: Error | null;
  isInitialized: boolean;
}

interface AuthContextType extends Omit<AuthState, 'isInitialized'> {
  refreshSession: (force?: boolean) => Promise<void>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  accessToken: null,
  isLoading: true,
  error: null,
  refreshSession: async () => {},
  signOut: async () => ({ error: null }),
});

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SESSION'; payload: { session: Session | null; user: User | null } }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'SIGN_OUT' }
  | { type: 'SET_INITIALIZED' };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SESSION':
      return {
        ...state,
        session: action.payload.session,
        user: action.payload.user,
        accessToken: action.payload.session?.access_token ?? null,
        isLoading: false,
        error: null,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SIGN_OUT':
      return {
        ...state,
        user: null,
        session: null,
        accessToken: null,
        isLoading: false,
        error: null,
      };
    case 'SET_INITIALIZED':
      return {
        ...state,
        isLoading: false,
      };
    default:
      return state;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    session: null,
    accessToken: null,
    isLoading: true,
    error: null,
    isInitialized: false,
  });
  
  const router = useRouter();
  const isMounted = useRef(true);
  const initialCheckDone = useRef(false);
  const refreshPromise = useRef<Promise<Session | null> | null>(null);
  const lastSessionCheck = useRef<number>(0);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refreshSession = useCallback(async (force = false): Promise<void> => {
    // Skip if we've checked recently (within 5 seconds) and not forcing
    const now = Date.now();
    if (!force && now - lastSessionCheck.current < 5000 && refreshPromise.current) {
      await refreshPromise.current;
      return;
    }
    
    // If a refresh is already in progress, wait for it
    if (refreshPromise.current) {
      await refreshPromise.current;
      return;
    }
    
    const refreshPromiseFn = async (): Promise<Session | null> => {
      try {
        if (!isMounted.current) return null;
        
        lastSessionCheck.current = Date.now();
        
        // Handle OAuth callback if needed
        if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
          try {
            const { data: { session: urlSession }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) throw sessionError;
            
            if (urlSession) {
              const cleanUrl = window.location.origin + window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
              
              dispatch({
                type: 'SET_SESSION',
                payload: { session: urlSession, user: urlSession.user }
              });
              
              // Use router instead of window.location
              router.replace('/roadmap');
              return urlSession;
            }
          } catch (error) {
            console.error('OAuth callback error:', error);
          }
        }
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!isMounted.current) return null;
        
        if (sessionError) throw sessionError;
        
        if (!session) {
          dispatch({ type: 'SIGN_OUT' });
          return null;
        }
        
        // Only fetch user data if we don't have it or if it's a forced refresh
        if (force || !state.user || state.user.id !== session.user.id) {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;
          
          dispatch({
            type: 'SET_SESSION',
            payload: { session, user: userData.user }
          });
        } else {
          dispatch({
            type: 'SET_SESSION',
            payload: { session, user: state.user }
          });
        }
        
        return session;
      } catch (error) {
        console.error('Session refresh error:', error);
        if (isMounted.current) {
          dispatch({
            type: 'SET_ERROR',
            payload: error instanceof Error ? error : new Error('Failed to refresh session')
          });
        }
        return null;
      } finally {
        if (isMounted.current) {
          refreshPromise.current = null;
          if (!initialCheckDone.current) {
            initialCheckDone.current = true;
            dispatch({ type: 'SET_INITIALIZED' });
          }
        }
      }
    };
    
    refreshPromise.current = refreshPromiseFn();
    return refreshPromise.current;
  }, [state.user, router]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (isMounted.current) {
      dispatch({ type: 'SIGN_OUT' });
    }
    return { error };
  }, []);

  // Set up auth state change listener
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let didUnsubscribe = false;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (didUnsubscribe) return;
        
        // Skip if session hasn't changed
        if (session?.access_token === state.session?.access_token) return;
        
        // Skip initial session if we've already handled it
        if (event === 'INITIAL_SESSION' && initialCheckDone.current) return;
        
        console.log('Auth state changed:', event);
        
        if (session) {
          dispatch({
            type: 'SET_SESSION',
            payload: { session, user: session.user }
          });
        } else {
          dispatch({ type: 'SIGN_OUT' });
        }
      }
    );
    
    // Initial session check
    refreshSession().catch(error => {
      console.error('Initial auth check failed:', error);
    });
    
    return () => {
      didUnsubscribe = true;
      subscription?.unsubscribe();
    };
  }, [refreshSession, state.session?.access_token]);
  
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user: state.user,
    session: state.session,
    accessToken: state.accessToken,
    isLoading: state.isLoading,
    error: state.error,
    refreshSession,
    signOut,
  }), [
    state.user,
    state.session,
    state.accessToken,
    state.isLoading,
    state.error,
    refreshSession,
    signOut,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
