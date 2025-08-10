'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, User, Shield, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
import { AvatarUploader } from './AvatarUploader';
import { convertToMilliseconds } from '@/hooks/useShuffleSettings';
import { useShuffleSettings, TimeUnit } from '@/hooks/useShuffleSettings';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // user prop removed since we're using useAuth() internally
}

type SettingsTab = 'general' | 'notifications' | 'account' | 'security';

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { user, refreshSession } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Shuffle settings
  const {
    timeValue,
    timeUnit,
    setTimeValue,
    setTimeUnit,
  } = useShuffleSettings();
  
  // Local state for form inputs
  const [localTimeValue, setLocalTimeValue] = useState(timeValue);
  const [localTimeUnit, setLocalTimeUnit] = useState<TimeUnit>(timeUnit);
  
  // Update local state when settings change
  useEffect(() => {
    setLocalTimeValue(timeValue);
    setLocalTimeUnit(timeUnit);
  }, [timeValue, timeUnit]);
  
  // Handle time value change
  const handleTimeValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setLocalTimeValue(value);
      setTimeValue(value);
    }
  };
  
  // Handle time unit change
  const handleTimeUnitChange = (unit: TimeUnit) => {
    setLocalTimeUnit(unit);
    setTimeUnit(unit);
  };
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatarUrl: user?.user_metadata?.avatar_url || '',
    newPassword: '',
    confirmPassword: '',
    avatarFile: null as File | null,
    deleteAvatar: false,
    notifications: {
      email: true,
      push: true,
      marketing: false,
    },
    twoFactorAuth: false,
    language: 'en',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters';
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleAvatarChange = (file: File | null) => {
    setFormData(prev => ({
      ...prev,
      avatarFile: file,
      deleteAvatar: file === null,
      // If file is null (deleted), clear the preview URL
      ...(file === null ? { avatarUrl: '' } : {})
    }));
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    
    setIsDeleting(true);
    try {
      // Delete user data from storage
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(user.id);
      
      if (files && files.length > 0) {
        const filePaths = files.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(filePaths);
      }
      
      // Delete user's profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      // Delete auth user
      const { error: deleteError } = await supabase.rpc('delete_user');
      if (deleteError) throw deleteError;
      
      // Sign out
      await supabase.auth.signOut();
      
      // Refresh the page to clear all state
      window.location.href = '/';
      
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(
        error instanceof Error 
          ? `Failed to delete account: ${error.message}`
          : 'Failed to delete account. Please try again.'
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Save the shuffle settings to localStorage
      const ms = convertToMilliseconds(localTimeValue, localTimeUnit);
      if (typeof window !== 'undefined') {
        localStorage.setItem('codeShuffleInterval', ms.toString());
        window.dispatchEvent(new CustomEvent('shuffleIntervalChanged', { detail: ms }));
      }
      
      // Handle avatar changes first
      if (formData.avatarFile) {
        // Upload new avatar
        const fileExt = formData.avatarFile.name.split('.').pop();
        const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        // Delete old avatars
        const { data: files } = await supabase.storage
          .from('avatars')
          .list(user?.id || '');
          
        if (files && files.length > 0) {
          const filePaths = files.map(f => `${user?.id}/${f.name}`);
          await supabase.storage.from('avatars').remove(filePaths);
        }

        // Upload new file
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, formData.avatarFile, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Update profile with new avatar
        await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user?.id);
          
        await supabase.auth.updateUser({
          data: { avatar_url: publicUrl }
        });
      } else if (formData.deleteAvatar) {
        // Delete avatar
        const { data: files } = await supabase.storage
          .from('avatars')
          .list(user?.id || '');
          
        if (files && files.length > 0) {
          const filePaths = files.map(f => `${user?.id}/${f.name}`);
          await supabase.storage.from('avatars').remove(filePaths);
        }
        
        // Remove avatar from profile
        await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('id', user?.id);
          
        await supabase.auth.updateUser({
          data: { avatar_url: null }
        });
      }
      
      // Update profile if name changed
      if (formData.name !== user?.user_metadata?.full_name) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ display_name: formData.name })
          .eq('id', user?.id);
          
        if (profileError) throw profileError;
      }
      
      // Update password if changed
      if (formData.newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.newPassword
        });
        
        if (passwordError) throw passwordError;
      }
      
      // Refresh session to get latest data
      await refreshSession(true);
      
      // Close the modal
      onOpenChange(false);
      
      // Show success message
      toast.success('Settings saved successfully');
      
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error(
        error instanceof Error 
          ? `Failed to save changes: ${error.message}`
          : 'Failed to save changes. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize form data with user data
  useEffect(() => {
    if (user) {
      // Get the user's display name from all possible locations
      // Match the exact fallback order from the old version
      const displayName = user.user_metadata?.display_name || 
                        user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        (user as { display_name?: string }).display_name ||
                        (user as { full_name?: string }).full_name || 
                        (user as { name?: string }).name ||
                        '';
      
      setFormData(prev => ({
        ...prev,
        name: displayName,
        email: user.email || '',
        avatarUrl: user.user_metadata?.avatar_url || (user as { avatar_url?: string }).avatar_url || '',
        deleteAvatar: false,
        avatarFile: null,
      }));
    }
  }, [user]);

  // Avatar updates are now handled directly in the AvatarUploader component
  // with a page reload to ensure all components get the update



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Temporarily disabled notifications
  // const handleNotificationChange = (key: string) => {
  //   setFormData(prev => ({
  //     ...prev,
  //     notifications: {
  //       ...prev.notifications,
  //       [key]: !prev.notifications[key as keyof typeof prev.notifications]
  //     }
  //   }));
  // };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl h-[90vh] sm:h-[80vh] max-h-screen flex flex-col sm:flex-row p-0 overflow-hidden">
        {/* Mobile header */}
        <div className="sm:hidden p-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium">
              {activeTab === 'general' && 'General Settings'}
              {activeTab === 'notifications' && 'Notifications'}
              {activeTab === 'account' && 'Account'}
              {activeTab === 'security' && 'Security'}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Mobile tab bar */}
        <div className="sm:hidden flex overflow-x-auto border-b">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <SettingsIcon className="inline-block h-4 w-4 mr-2" />
            General
          </button>
          {/* Temporarily disabled Notifications
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'notifications'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bell className="inline-block h-4 w-4 mr-2" />
            Notifications
          </button>
          */}
          <button
            onClick={() => setActiveTab('account')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'account'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="inline-block h-4 w-4 mr-2" />
            Account
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'security'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="inline-block h-4 w-4 mr-2" />
            Security
          </button>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden sm:flex sm:w-64 border-r p-4 flex-col">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-lg font-medium">Settings</DialogTitle>
          </DialogHeader>
          
          <nav className="space-y-1">
            <Button
              variant={activeTab === 'general' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('general')}
            >
              <SettingsIcon className="mr-2 h-4 w-4" />
              General
            </Button>
            {/* Temporarily disabled Notifications
            <Button
              variant={activeTab === 'notifications' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('notifications')}
            >
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Button>
            */}
            <Button
              variant={activeTab === 'account' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('account')}
            >
              <User className="mr-2 h-4 w-4" />
              Account
            </Button>
            <Button
              variant={activeTab === 'security' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('security')}
            >
              <Shield className="mr-2 h-4 w-4" />
              Security
            </Button>
          </nav>
        </div>

        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold">General Settings</h2>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium">Theme</h3>
                    <p className="text-sm text-muted-foreground">Customize your theme</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => setTheme('light')}
                    >
                      <Sun className="h-4 w-4 mr-2" /> Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => setTheme('dark')}
                    >
                      <Moon className="h-4 w-4 mr-2" /> Dark
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium">Code Shuffling</h3>
                    <p className="text-sm text-muted-foreground">How often to rotate through your personal codes</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-[80px]">
                      <Input
                        type="number"
                        min={1}
                        value={localTimeValue}
                        onChange={handleTimeValueChange}
                        className="w-full"
                      />
                    </div>
                    <Select
                      value={localTimeUnit}
                      onValueChange={handleTimeUnitChange}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seconds">Seconds</SelectItem>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <label className="block mb-2 text-sm font-medium">Language</label>
                  <div className="relative">
                    <select
                      value="en"
                      disabled
                      className="w-full pl-3 pr-8 py-2.5 text-sm border rounded-md appearance-none bg-muted/50 cursor-not-allowed text-muted-foreground"
                    >
                      <option value="en">English (Only available option)</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Temporarily disabled Notifications
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Notification Settings</h2>
              <div className="space-y-4">
                {Object.entries(formData.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium capitalize">{key} Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        {key === 'email' && 'Receive email notifications'}
                        {key === 'push' && 'Receive push notifications'}
                        {key === 'marketing' && 'Receive marketing communications'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={() => handleNotificationChange(key)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          */}

          {activeTab === 'account' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Account Information</h2>
              <div className="space-y-6">
                <div className="flex flex-col items-center p-6 border rounded-lg space-y-4">
                  <AvatarUploader 
                    currentAvatarUrl={formData.avatarUrl}
                    onAvatarChange={handleAvatarChange}
                    isSaving={isLoading}
                  />
                </div>
                
                <div className="p-4 border rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md"
                      disabled
                    />

                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-background/50">
                  <h3 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Danger Zone
                  </h3>
                  <p className="text-sm text-muted-foreground my-3">
                    Once you delete your account, all your data will be permanently removed. This action cannot be undone.
                  </p>
                  
                  {!showDeleteConfirm ? (
                    <Button 
                      variant="outline"
                      size="sm" 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="font-medium"
                    >
                      Delete Account
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Are you sure you want to delete your account?</p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          size="sm" 
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={isDeleting}
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive"
                          size="sm" 
                          onClick={handleDeleteAccount}
                          disabled={isDeleting}
                        >
                          {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Security</h2>
              <div className="space-y-4">
                {/* Temporarily disabled Two-Factor Authentication
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.twoFactorAuth}
                        onChange={() => setFormData({...formData, twoFactorAuth: !formData.twoFactorAuth})}
                        className="sr-only peer"
                        disabled
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  {formData.twoFactorAuth && (
                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <p className="text-sm">Scan this QR code with your authenticator app:</p>
                      <div className="mt-2 p-2 bg-white inline-block rounded">
                        <div className="w-32 h-32 bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                          QR Code
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                */}

                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-4">Change Password</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">New Password</label>
                      <input
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md"
                        placeholder="Enter new password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md"
                        placeholder="Confirm new password"
                      />
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-500">{errors.password}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between items-center">
            {errors.general && (
              <p className="text-sm text-red-500">{errors.general}</p>
            )}
            <div className="flex space-x-2 ml-auto">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
