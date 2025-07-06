'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getSignedUrl } from '@/lib/supabase/storage';
import { Loader2 } from 'lucide-react';

interface ImageWithSignedUrlProps {
  storagePath: string;
  alt?: string;
  title?: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function ImageWithSignedUrl({ 
  storagePath, 
  alt = '', 
  className = '',
  ...props 
}: ImageWithSignedUrlProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!storagePath) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let refreshTimer: NodeJS.Timeout;

    const loadImage = async () => {
      try {
        // Extract the path without the bucket prefix
        const path = storagePath.startsWith('notes-attachments/')
          ? storagePath.substring('notes-attachments/'.length)
          : storagePath;

        // Get a signed URL that's valid for 1 hour
        const url = await getSignedUrl(path, 3600);
        
        if (!url) throw new Error('Failed to generate signed URL');
        
        if (isMounted) {
          setSignedUrl(url);
          
          // Set up refresh 10 minutes before expiration (50 minutes from now)
          refreshTimer = setTimeout(loadImage, 50 * 60 * 1000);
        }
      } catch (error) {
        console.error('Error loading image:', error);
        if (isMounted) {
          setSignedUrl(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [storagePath]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded text-gray-500 text-sm p-4 ${className}`}>
        Failed to load image
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Image
        src={signedUrl}
        alt={alt || ''}
        width={props.width || 800}
        height={props.height || 600}
        className="max-w-full h-auto rounded-md"
        priority={props.priority}
        onError={(e) => {
          // Fallback to a placeholder if the image fails to load
          const target = e.target as HTMLImageElement;
          target.onerror = null;
          target.src = '/placeholder-image.png';
        }}
      />
    </div>
  );
}
