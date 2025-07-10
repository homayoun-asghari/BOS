import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

type SignedUrlOptions = {
  expiresIn?: number;
  download?: boolean;
  downloadFilename?: string;
};

// Create a single instance of the Supabase client
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

const getSupabaseClient = () => {
  if (!supabaseClient && typeof window !== 'undefined') {
    supabaseClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            // Handle cookie retrieval manually to avoid JSON parsing errors
            const value = document.cookie
              .split('; ')
              .find((row) => row.startsWith(`${name}=`))
              ?.split('=')[1];
            return value ? decodeURIComponent(value) : null;
          },
        },
      }
    );
  }
  return supabaseClient;
};

export const getSignedUrl = async (
  filePath: string,
  options: SignedUrlOptions = {}
): Promise<string | null> => {
  const { expiresIn = 3600, download = false, downloadFilename } = options;
  const supabase = getSupabaseClient();

  try {
    // Get session without throwing errors
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('No active session found for signed URL generation');
      }
      return null;
    }

    // Normalize the file path by removing any leading 'notes-attachments/' prefix
    const normalizedPath = filePath.startsWith('notes-attachments/') 
      ? filePath.replace('notes-attachments/', '') 
      : filePath;

    // Generate signed URL silently
    
    const { data, error } = await supabase.storage
      .from('notes-attachments')
      .createSignedUrl(normalizedPath, expiresIn, {
        download,
        ...(downloadFilename ? { downloadFilename } : {}),
      });

    if (error) {
      console.error('Error from Supabase when generating signed URL:', {
        error,
        normalizedPath,
        originalPath: filePath
      });
      throw error;
    }
    
    return data.signedUrl;
    
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error generating signed URL:', {
        error,
        filePath,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return null;
  }
};

// All file access is done through signed URLs for private bucket access
