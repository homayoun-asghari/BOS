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
  });

  if (error) throw new Error(error.message);

  // Wait for email confirmation, profile will be inserted after sign-in
  return data.user!;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);

  // Insert profile after sign in
  await insertUserProfileIfNotExists(data.user);

  return data.user!;
}

export async function insertUserProfileIfNotExists(user: User | null) {
  if (!user) throw new Error('User not found');

  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 = No rows found (not an error)
    throw fetchError;
  }

  if (!existing) {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      username: user.email?.split('@')[0],
      full_name: user.user_metadata?.name || '',
      avatar_url: user.user_metadata?.avatar_url || '',
    });

    if (insertError) throw insertError;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
