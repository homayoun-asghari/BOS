import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        full_name: email.split('@')[0], // Default name from email
      }
    },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('No user data returned');
  
  return data.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('No user data returned');
  
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

// Helper to get the current user
export function getCurrentUser() {
  return supabase.auth.getUser();
}

// Helper to get the current session
export function getCurrentSession() {
  return supabase.auth.getSession();
}