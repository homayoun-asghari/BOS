'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Bell, User, Shield, Settings as SettingsIcon } from 'lucide-react';
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

interface UserData {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
}

type SettingsTab = 'general' | 'notifications' | 'account' | 'security';

export function SettingsModal({ open, onOpenChange, user }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isLoading, setIsLoading] = useState(false);
  
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
    name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    notifications: {
      email: true,
      push: true,
      marketing: false,
    },
    twoFactorAuth: false,
    language: 'en',
  });

  const handleSave = async () => {
    setIsLoading(true);
    
    // Save the current values
    const ms = convertToMilliseconds(localTimeValue, localTimeUnit);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('codeShuffleInterval', ms.toString());
        
        // Dispatch a custom event that TheCode component can listen to
        window.dispatchEvent(new CustomEvent('shuffleIntervalChanged', { detail: ms }));
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
    }
    
    // Close the modal
    setTimeout(() => {
      setIsLoading(false);
      onOpenChange(false);
    }, 300);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNotificationChange = (key: string) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key as keyof typeof prev.notifications]
      }
    }));
  };

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
            <Button
              variant={activeTab === 'notifications' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('notifications')}
            >
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Button>
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
                      value={formData.language}
                      onChange={(e) => setFormData({...formData, language: e.target.value})}
                      className="w-full pl-3 pr-8 py-2.5 text-sm border rounded-md appearance-none bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
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

          {activeTab === 'account' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Account Information</h2>
              <div className="space-y-4">
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
                    <p className="text-xs text-muted-foreground mt-1">Contact support to change your email</p>
                  </div>
                </div>

                <div className="p-4 border-2 border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/30">
                  <h3 className="font-medium text-red-700 dark:text-red-400">Danger Zone</h3>
                  <p className="text-sm text-red-600 dark:text-red-400/80 mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => {}}
                    className="font-medium bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 transition-colors"
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Security</h2>
              <div className="space-y-4">
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
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  {formData.twoFactorAuth && (
                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <p className="text-sm">Scan this QR code with your authenticator app:</p>
                      <div className="mt-2 p-2 bg-white inline-block rounded">
                        {/* Placeholder for QR code */}
                        <div className="w-32 h-32 bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                          QR Code
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Change Password</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Current Password</label>
                      <input
                        type="password"
                        className="w-full p-2 border rounded-md"
                        placeholder="Enter current password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">New Password</label>
                      <input
                        type="password"
                        className="w-full p-2 border rounded-md"
                        placeholder="Enter new password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        className="w-full p-2 border rounded-md"
                        placeholder="Confirm new password"
                      />
                    </div>
                    <Button size="sm">Update Password</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
