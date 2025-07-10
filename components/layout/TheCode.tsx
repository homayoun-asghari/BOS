"use client";

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import { motion, AnimatePresence } from 'framer-motion';
import { useShuffleSettings } from '@/hooks/useShuffleSettings';

interface TheCodeHandles {
  updateShuffleInterval: (interval: number) => void;
}

interface TheCodeProps {
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  componentRef?: React.RefObject<TheCodeHandles>;
}

interface PersonalCode {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  isEditing?: boolean;
  tempContent?: string;
}

const TheCode = forwardRef<TheCodeHandles, TheCodeProps>(({ isOpen: propIsOpen, onOpenChange }, ref) => {
  const { user } = useUser();

  const [isOpen, setIsOpen] = useState(propIsOpen || false);
  
  // Sync with parent component's state
  useEffect(() => {
    if (propIsOpen !== undefined) {
      setIsOpen(propIsOpen);
    }
  }, [propIsOpen]);
  
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  }, [onOpenChange]);

  const [inputValue, setInputValue] = useState('');
  const [codes, setCodes] = useState<PersonalCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCodeIndex, setCurrentCodeIndex] = useState(0);
  const { shuffleInterval } = useShuffleSettings();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const shuffleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    updateShuffleInterval: (newInterval: number) => {
      // Update the interval immediately
      if (shuffleTimerRef.current) {
        clearInterval(shuffleTimerRef.current);
        shuffleTimerRef.current = null;
      }
      
      // Only set new interval if we have codes to rotate
      if (codes.length > 1) {
        const rotateCode = () => setCurrentCodeIndex(prev => (prev + 1) % codes.length);
        shuffleTimerRef.current = setInterval(rotateCode, newInterval);
        console.log('Updated shuffle interval to:', newInterval);
      }
    }
  }), [codes.length]);



  // Add a new personal code
  const handleAddCode = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const value = inputValue.trim();
    if (!value || !user) return;
    
    try {
      const { error } = await supabase
        .from('personal_codes')
        .insert([{ 
          user_id: user.id, 
          content: value 
        }]);
      
      if (error) throw error;
      
      setInputValue('');
      setIsOpen(false);
      await fetchPersonalCodesMemoized(); // Refresh the list
    } catch (error) {
      console.error('Error adding personal code:', error);
    }
  };

  // Start editing a code
  const startEditing = (code: PersonalCode) => {
    setCodes(codes.map(c => ({
      ...c,
      isEditing: c.id === code.id,
      tempContent: c.id === code.id ? c.content : c.tempContent
    })));
    setEditingId(code.id);
  };

  // Save edited code
  const saveEdit = async (code: PersonalCode) => {
    if (!code.tempContent?.trim()) return;
    
    try {
      const { error } = await supabase
        .from('personal_codes')
        .update({ content: code.tempContent })
        .eq('id', code.id);
      
      if (error) throw error;
      
      await fetchPersonalCodesMemoized(); // Refresh the list
    } catch (error) {
      console.error('Error updating personal code:', error);
    } finally {
      setEditingId(null);
    }
  };

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setCodes(currentCodes => currentCodes.map(c => ({
      ...c,
      isEditing: false,
      tempContent: c.content
    })));
    setEditingId(null);
  }, []);

  // Delete a personal code
  const handleDeleteCode = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('personal_codes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      await fetchPersonalCodesMemoized(); // Refresh the list
    } catch (error) {
      console.error('Error deleting personal code:', error);
    }
  };

  // Memoize fetchPersonalCodes to prevent unnecessary re-renders
  const fetchPersonalCodesMemoized = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('personal_codes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error fetching personal codes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Set up the shuffle interval when codes or shuffleInterval changes
  useEffect(() => {
    if (codes.length <= 1) {
      if (shuffleTimerRef.current) {
        clearInterval(shuffleTimerRef.current);
        shuffleTimerRef.current = null;
      }
      return;
    }

    // Clear existing interval
    if (shuffleTimerRef.current) {
      clearInterval(shuffleTimerRef.current);
      shuffleTimerRef.current = null;
    }

    // Set up new interval
    const rotateCode = () => {
      setCurrentCodeIndex(prevIndex => (prevIndex + 1) % codes.length);
    };
    
    // Initial delay before starting the rotation
    const initialDelay = 2000; // 2 seconds
    
    const timeoutId = setTimeout(() => {
      // Only set up the interval if we have more than one code
      if (codes.length > 1) {
        // Start the interval
        rotateCode(); // Show next code immediately after delay
        
        // Set up the interval for subsequent rotations
        shuffleTimerRef.current = setInterval(rotateCode, shuffleInterval);
      }
    }, initialDelay);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (shuffleTimerRef.current) {
        clearInterval(shuffleTimerRef.current);
        shuffleTimerRef.current = null;
      }
    };
  }, [codes.length, shuffleInterval]);
  
  // Listen for shuffle interval changes and clean up on unmount
  useEffect(() => {
    const handleShuffleIntervalChange = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      const newInterval = customEvent.detail;
      
      if (shuffleTimerRef.current) {
        clearInterval(shuffleTimerRef.current);
        shuffleTimerRef.current = null;
      }
      
      if (codes.length > 1) {
        const rotateCode = () => setCurrentCodeIndex(prev => (prev + 1) % codes.length);
        shuffleTimerRef.current = setInterval(rotateCode, newInterval);
        console.log('Updated shuffle interval via event to:', newInterval);
      }
    };
    
    window.addEventListener('shuffleIntervalChanged', handleShuffleIntervalChange as EventListener);
    
    return () => {
      window.removeEventListener('shuffleIntervalChanged', handleShuffleIntervalChange as EventListener);
      if (shuffleTimerRef.current) {
        clearInterval(shuffleTimerRef.current);
      }
    };
  }, [codes.length]);
  
  // Fetch codes when component mounts or user changes
  useEffect(() => {
    fetchPersonalCodesMemoized();
    return () => {
      if (shuffleTimerRef.current) {
        clearInterval(shuffleTimerRef.current);
      }
    };
  }, [fetchPersonalCodesMemoized]);

  // Close dropdown when clicking outside or on user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't do anything if dropdown is closed
      if (!isOpen) return;
      
      const target = event.target as HTMLElement;
      
      // Close if clicking on user menu or its items
      const isUserMenu = target.closest('[role="menu"], [role="menuitem"], [data-radix-collection-item], button[aria-haspopup="menu"]');
      if (isUserMenu) {
        if (editingId) {
          cancelEdit();
        } else {
          handleOpenChange(false);
        }
        return;
      }
      
      // Close if clicking outside the dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        if (editingId) {
          cancelEdit();
        } else {
          handleOpenChange(false);
        }
      }
    };

    // Handle Escape key to close dropdown
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (editingId) {
          cancelEdit();
        } else {
          handleOpenChange(false);
        }
      }
    };

    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, editingId, cancelEdit, handleOpenChange]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const resizeTextarea = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    };

    resizeTextarea();
  }, [inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddCode(e as unknown as React.MouseEvent);
    }
  };

  return (
    <div className="w-full" ref={dropdownRef}>
      <div className="relative w-full">
        <button
          onClick={() => handleOpenChange(!isOpen)}
          className="w-full flex items-center justify-between p-2.5 border border-border rounded-lg text-left hover:border-ring/50 transition-colors bg-background h-10"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          type="button"
        >
          <div className="relative h-5 overflow-hidden flex-1 max-w-[calc(100%-24px)]">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentCodeIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute inset-0 text-muted-foreground text-sm truncate pr-2 text-left"
                title={codes.length > 0 ? codes[currentCodeIndex]?.content : ''}
              >
                {isLoading ? 'Loading...' : codes.length > 0 ? codes[currentCodeIndex]?.content : 'Who Do You Want To Become?'}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="sr-only">{isOpen ? 'Collapse' : 'Expand'} personal codes</span>
          <ChevronDown 
            className={`h-4 w-4 text-muted-foreground/80 transition-transform ${isOpen ? 'rotate-180' : ''} flex-shrink-0`}
            aria-hidden="false"
          />
        </button>
        
        {isOpen && (
          <div 
            className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden p-0.5 px-1.5"
            role="dialog"
            aria-modal="true"
          >
            <div className="max-h-60 overflow-y-auto ">
              {isLoading ? (
                <div className="text-center py-4 text-sm text-muted-foreground">Loading...</div>
              ) : codes.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">No personal codes yet. Add one below!</div>
              ) : (
                <ul className="divide-y divide-border">
                  {codes.map((code) => (
                    <li 
                      key={code.id} 
                      className="py-2 px-3 hover:bg-muted/50 rounded-md transition-colors flex flex-col gap-2"
                    >
                      {editingId === code.id ? (
                        <div className="flex flex-col gap-2">
                          <Textarea
                            value={code.tempContent || code.content}
                            onChange={(e) => {
                              const newContent = e.target.value;
                              setCodes(codes.map(c => 
                                c.id === code.id 
                                  ? { ...c, tempContent: newContent } 
                                  : c
                              ));
                            }}
                            className="min-h-[60px] w-full text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                saveEdit(code);
                              } else if (e.key === 'Escape') {
                                cancelEdit();
                              }
                            }}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={cancelEdit}
                              className="text-xs px-2 py-1 rounded border border-border hover:bg-muted"
                              type="button"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(code)}
                              className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                              type="button"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <span 
                            className="text-sm flex-1 pr-2"
                            onDoubleClick={() => startEditing(code)}
                          >
                            {code.content}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditing(code)}
                              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
                              aria-label="Edit code"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCode(code.id, e)}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-full hover:bg-muted"
                              aria-label="Delete code"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="relative border-t border-border mt-2 pt-2">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value)}
                placeholder="Add a new personal code..."
                className="min-h-[40px] h-10 pr-10 resize-none w-full px-3 py-2"
                onKeyDown={handleKeyDown}
                aria-label="Add a new personal code"
                variant="ghost"
                rows={1}
              />
              <button
                type="button"
                onClick={handleAddCode}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0 rounded-full hover:bg-muted/50 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                disabled={!inputValue.trim()}
                aria-label="Add code"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

TheCode.displayName = 'TheCode';

export { TheCode };
