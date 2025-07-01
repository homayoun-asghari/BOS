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
  // First sign up the user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        full_name: email.split('@')[0], // Default name from email
        username: email.split('@')[0]   // Default username from email
      }
    },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('No user data returned');
  
  // Create profile in a separate transaction
  const { error: profileError } = await supabase
    .from('profiles')
    .insert([
      { 
        id: data.user.id,
        email: email,
        username: email.split('@')[0],
        full_name: email.split('@')[0]
      }
    ]);

  if (profileError) {
    console.error('Profile creation error:', profileError);
    // Don't fail the signup if profile creation fails
    // The user can update their profile later
  }
  
  return data.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);

  // Ensure profile exists after sign in
  await insertUserProfileIfNotExists(data.user);

  return data.user!;
}

export async function insertUserProfileIfNotExists(user: User | null) {
  if (!user) throw new Error('User not found');

  try {
    // Try to insert the profile
    const { error: insertError } = await supabase
      .from('profiles')
      .insert([
        { 
          id: user.id,
          email: user.email,
          username: user.email?.split('@')[0],
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
        }
      ])
      .select()
      .single();

    // If the error is not a duplicate key error, log it
    if (insertError && !insertError.message.includes('duplicate key')) {
      console.error('Error creating profile:', insertError);
    }
  } catch (error) {
    console.error('Error in insertUserProfileIfNotExists:', error);
    // Don't throw the error, as we don't want to block the auth flow
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
