import { supabase } from '@/lib/supabase/client';

// Cache for signed URLs to avoid unnecessary API calls
interface UrlCacheEntry {
  url: string;
  expires: number;
}

const URL_CACHE = new Map<string, UrlCacheEntry>();
const CACHE_TTL = 55 * 60 * 1000; // 55 minutes

/**
 * Gets a secure signed URL for a file in Supabase Storage
 * @param publicUrl The public URL of the file in Supabase Storage
 * @returns A signed URL that's valid for 1 hour
 */
export async function getSecureFileUrl(publicUrl: string): Promise<string> {
  // Skip if URL is empty or already has a token
  if (!publicUrl) return publicUrl;
  
  // Check cache first
  const cached = URL_CACHE.get(publicUrl);
  if (cached && Date.now() < cached.expires) {
    return cached.url;
  }
  
  // If already a signed URL, return as is
  if (publicUrl.includes('token=')) {
    return publicUrl;
  }
  
  // In development, we still want to sign URLs to test the flow
  // but we'll use a shorter expiration time (5 minutes)

  try {
    // Check if URL is already a signed URL
    if (publicUrl.includes('token=')) {
      return publicUrl;
    }

    // Extract bucket and file path from URL
    const urlObj = new URL(publicUrl);
    
    // Handle different URL formats
    let filePath: string;
    let bucket = 'notes-attachments'; // Default bucket name
    
    // Check if this is a public URL format
    if (publicUrl.includes('/storage/v1/object/public/')) {
      // Format: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[file-path]
      const pathParts = urlObj.pathname.split('/');
      const publicIndex = pathParts.indexOf('public');
      if (publicIndex !== -1 && pathParts.length > publicIndex + 2) {
        bucket = pathParts[publicIndex + 1];
        filePath = pathParts.slice(publicIndex + 2).join('/');
      } else {
        console.warn('Unexpected public URL format:', publicUrl);
        return publicUrl;
      }
    } else if (publicUrl.includes('/storage/v1/object/sign/')) {
      // This is already a signed URL
      return publicUrl;
    } else {
      console.warn('Unsupported URL format for signing:', publicUrl);
      return publicUrl;
    }

    console.log('Generating signed URL for bucket:', bucket, 'path:', filePath);
    
    // Generate a signed URL that's valid for 1 hour (3600 seconds)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600);

    if (error) {
      console.error('Error generating signed URL:', error);
      return publicUrl; // Return original URL if there's an error
    }

    console.log('Successfully generated signed URL:', data.signedUrl);
    
    // Cache the signed URL
    URL_CACHE.set(publicUrl, {
      url: data.signedUrl,
      expires: Date.now() + CACHE_TTL
    });

    return data.signedUrl;
  } catch (error) {
    console.error('Error in getSecureFileUrl:', error);
    return publicUrl; // Return original URL if there's an error
  }
}
