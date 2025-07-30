'use client';

import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';


interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { refreshSession } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Check for password reset flow
  useEffect(() => {
    const checkResetFlow = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const resetParam = urlParams.get('reset');
      const accessToken = urlParams.get('access_token');
      const type = urlParams.get('type');
      
      if (resetParam === 'true' || (accessToken && type === 'recovery')) {
        // This means we came from the password reset email
        setMode('reset-password');
        
        // Clean up URL without page reload
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        // Ensure the modal is open
        if (!open) {
          onOpenChange(true);
        }
      }
    };
    
    // Run immediately in case the component is already mounted
    checkResetFlow();
    
    // Also listen for URL changes in case the component mounts before the URL is processed
    window.addEventListener('popstate', checkResetFlow);
    return () => window.removeEventListener('popstate', checkResetFlow);
  }, [onOpenChange, open]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setUsername('');
    setAcceptedTerms(false);
    // Don't clear success/error messages here
  };

  const handleModeChange = (newMode: AuthMode) => {
    resetForm();
    setError(null);
    setSuccessMessage(null);
    setMode(newMode);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Refresh session and wait for it to complete
      await refreshSession();
      resetForm();
      onOpenChange(false);
      // Navigate to dashboard after successful login
      router.push('/roadmap');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };


  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!fullName.trim()) {
      setError('Full name is required');
      setIsLoading(false);
      return;
    }

    if (!username.trim()) {
      setError('Username is required');
      setIsLoading(false);
      return;
    }

    if (!acceptedTerms) {
      setError('You must accept the terms and conditions');
      setIsLoading(false);
      return;
    }
    try {
      // First check if email already exists in profiles table
      const { data: existingUserByEmail } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (existingUserByEmail) {
        setError('This email address is already registered. Please use another email or try to login.');
        setIsLoading(false);
        return;
      }
      
      // Then check if username already exists
      const { data: existingUser, error: usernameCheckError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.trim().toLowerCase())
        .maybeSingle();

      if (usernameCheckError) {
        console.error('Error checking username:', usernameCheckError);
      }
      
      if (existingUser) {
        setError('This username is already taken. Please choose another one.');
        setIsLoading(false);
        return;
      }

      // Now try to create the auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: fullName.trim(),  // Match the field name expected by the trigger
            username: username.trim().toLowerCase(),
            terms_accepted_at: new Date().toISOString(),
            terms_version: '1.0'
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      // Handle various auth errors
      if (signUpError) {
        // Check for specific error types
        if (signUpError.message?.toLowerCase().includes('email') && 
            signUpError.message?.toLowerCase().includes('exist')) {
          setError('This email address is already registered. Please use another email or try to login.');
        } else if (signUpError.message?.includes('password')) {
          setError('Invalid password. Password must be at least 8 characters long.');
        } else {
          // Generic error handling
          console.error('Signup error:', signUpError);
          setError(signUpError.message || 'Failed to create account');
        }
        return;
      }
      
      // Check if we actually got user data back to confirm success
      if (!signUpData || !signUpData.user) {
        setError('Something went wrong during signup. Please try again.');
        return;
      }
      
      // Show specific success message with clear email confirmation instructions
      setSuccessMessage('Account created successfully! YOU MUST CHECK YOUR EMAIL and click the confirmation link to activate your account.');
      // Don't reset form yet, so the success message remains visible
      // resetForm(); - removing this so the success message stays
    } catch (err: unknown) {
      console.error('Unexpected error during signup:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  // Handle forgot password submission
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}?reset=true`,
      });

      if (error) throw error;
      
      setSuccessMessage('Password reset link sent! Please check your email.');
      // Clear the email field after successful submission
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Get the access token from the URL if present
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('access_token');
      
      if (accessToken) {
        // If we have an access token, set the session first
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: ''
        });
        
        if (sessionError) throw sessionError;
      }

      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;
      
      setSuccessMessage('Password updated successfully! You can now log in with your new password.');
      
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      setTimeout(() => {
        handleModeChange('login');
        // Clear the form
        setPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password UI
  if (mode === 'forgot-password') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-2xl font-bold">Reset Password</DialogTitle>
            <CardDescription className="mt-1">
              Enter your email to receive a password reset link
            </CardDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email-forgot">Email</Label>
              <Input
                id="email-forgot"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="text-sm text-primary hover:underline"
              >
                Back to Login
              </button>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {successMessage && <p className="text-green-600 text-sm">{successMessage}</p>}
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Reset Password UI
  if (mode === 'reset-password') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-2xl font-bold">Set New Password</DialogTitle>
            <CardDescription className="mt-1">
              Enter your new password below
            </CardDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Password'}
            </Button>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {successMessage && <p className="text-green-600 text-sm">{successMessage}</p>}
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Main Auth UI (Login/Signup)
  return (
    <Dialog open={open} onOpenChange={(openState) => {
      onOpenChange(openState);
      if (!openState) resetForm(); // Reset when closing
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-bold">
            {mode === 'login' ? 'Welcome back' : 'Create an account'}
          </DialogTitle>
          <CardDescription className="mt-1">
            {mode === 'login' 
              ? 'Enter your credentials to sign in to your account.'
              : 'Fill in your details to create a new account.'
            }
          </CardDescription>
        </DialogHeader>
        <Tabs 
          value={mode}
          className="w-full mt-4"
          onValueChange={(value) => handleModeChange(value as AuthMode)}
        >
          <TabsList>
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-login">Email</Label>
                <Input
                  id="email-login"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password-login">Password</Label>
                  <button
                    type="button"
                    onClick={() => handleModeChange('forgot-password')}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password-login"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full mt-4"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullname-signup">Full Name</Label>
                <Input
                  id="fullname-signup"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username-signup">Username</Label>
                <Input
                  id="username-signup"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))}
                  placeholder="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-signup">Email</Label>
                <Input
                  id="email-signup"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">Password</Label>
                <Input
                  id="password-signup"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword-signup">Confirm Password</Label>
                <Input
                  id="confirmPassword-signup"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="flex items-start space-x-2 py-2">
                <input
                  type="checkbox"
                  id="terms-checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  required
                />
                <label htmlFor="terms-checkbox" className="text-sm text-muted-foreground">
                  I agree to the <a onClick={(e) => { e.preventDefault(); const w = window.open('about:blank', '_blank'); if (w) w.location.href = window.location.origin + '/terms'; }} className="text-primary hover:underline cursor-pointer">Terms and Conditions</a> and <a onClick={(e) => { e.preventDefault(); const w = window.open('about:blank', '_blank'); if (w) w.location.href = window.location.origin + '/privacy'; }} className="text-primary hover:underline cursor-pointer">Privacy Policy</a>
                </label>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !acceptedTerms}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        {error && (
          <p className="text-red-500 text-sm mt-4">{error}</p>
        )}
        {successMessage && (
          <p className="text-green-600 text-sm mt-4">{successMessage}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
