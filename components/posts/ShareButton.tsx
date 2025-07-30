"use client";

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Share2, X, Copy, Check, ExternalLink } from 'lucide-react';

interface ShareButtonProps {
  postId: string;
  onShare?: () => Promise<void>;
  className?: string;
}

export function ShareButton({
  postId,
  onShare,
  className,
}: ShareButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);
  
  // Create share URL with proper format
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}?post=${postId}`;
  
  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showModal && event.target instanceof HTMLElement) {
        if (event.target.id === 'share-modal-backdrop') {
          setShowModal(false);
        }
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModal]);
  
  // Reset copied state
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);
  
  // Focus input when modal opens
  useEffect(() => {
    if (showModal && urlInputRef.current) {
      setTimeout(() => {
        urlInputRef.current?.select();
        urlInputRef.current?.focus();
      }, 100);
    }
  }, [showModal]);

  // Copy URL to clipboard - this method works on all devices
  const copyUrlToClipboard = () => {
    if (!urlInputRef.current) return;
    
    // Select the input
    urlInputRef.current.select();
    urlInputRef.current.setSelectionRange(0, 99999);
    
    // Try the modern way first
    try {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
      }).catch(() => {
        // Fallback to execCommand
        try {
          document.execCommand('copy');
          setCopied(true);
        } catch (_) {
          alert(`Please copy this URL manually: ${shareUrl}`);
        }
      });
    } catch (_) {
      // Another fallback in case clipboard API is not available
      try {
        document.execCommand('copy');
        setCopied(true);
      } catch (_) {
        alert(`Please copy this URL manually: ${shareUrl}`);
      }
    }
  };
  
  // Open share modal with URL input
  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      // Always show the share modal
      setShowModal(true);
      
      // Call onShare callback if provided
      if (onShare) {
        await onShare();
      }
    } catch (error) {
      console.error('Error in share button:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Direct open in new tab
  const openInNewTab = () => {
    window.open(shareUrl, '_blank');
    setShowModal(false);
  };

  return (
    <>
      {/* Share Button */}
      <div className={className}>
        <button
          onClick={handleClick}
          className={cn(
            "flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 text-white transition-colors hover:bg-black/40",
            isLoading && "opacity-70 cursor-not-allowed"
          )}
          disabled={isLoading}
          aria-label="Share"
        >
          <Share2 className="w-5 h-5 stroke-2" />
        </button>
      </div>
      
      {/* Share Modal */}
      {showModal && (
        <div 
          id="share-modal-backdrop"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div 
            className="bg-background rounded-lg shadow-lg w-full max-w-md mx-auto p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Share this post</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full hover:bg-muted"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center h-10">
                <input
                  ref={urlInputRef}
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-grow h-full px-3 border rounded-l-md bg-muted focus:outline-none"
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={copyUrlToClipboard}
                  className="h-full px-3 bg-primary text-primary-foreground rounded-r-md hover:bg-primary/90 flex items-center justify-center"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={openInNewTab}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
              >
                <ExternalLink size={16} />
                Open in new tab
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
