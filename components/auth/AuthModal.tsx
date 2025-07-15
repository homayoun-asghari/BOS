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
import { useState } from 'react';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { refreshSession } = useAuth();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setUsername('');
    setError(null);
    setSuccessMessage(null);
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
      router.push('/dashboard');
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

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            username: username.trim().toLowerCase(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) throw signUpError;
      
      setSuccessMessage('Account created! Please check your email to confirm your account.');
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState('login');

  return (
    <Dialog open={open} onOpenChange={(openState) => {
      onOpenChange(openState);
      if (!openState) resetForm(); // Reset when closing
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-bold">
            {activeTab === 'login' ? 'Welcome back' : 'Create an account'}
          </DialogTitle>
          <CardDescription className="mt-1">
            {activeTab === 'login' 
              ? 'Enter your credentials to sign in to your account.'
              : 'Fill in your details to create a new account.'
            }
          </CardDescription>
        </DialogHeader>
        <Tabs 
          defaultValue="login" 
          className="w-full mt-4"
          onValueChange={setActiveTab}
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
                <Label htmlFor="password-login">Password</Label>
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
                  placeholder="Your full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username-signup">Username</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    id="username-signup"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))}
                    placeholder="username"
                    className="pl-7"
                    required
                  />
                </div>
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
              <Button type="submit" className="w-full" disabled={isLoading}>
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
