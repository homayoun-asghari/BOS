import { supabase } from '@/lib/supabase/client';

export async function checkStoragePermissions(bucketName: string, userId: string) {
  try {
    console.log('Checking storage permissions...');
    
    // Check if we can list files in the bucket
    const { data: bucketData, error: bucketError } = await supabase.storage
      .from(bucketName)
      .list();
    
    if (bucketError) {
      console.error('Error listing bucket contents:', bucketError);
    } else {
      console.log('Bucket contents:', bucketData);
    }
    
    // Check if we can list files in the user's directory
    const { data: userFiles, error: userFilesError } = await supabase.storage
      .from(bucketName)
      .list(userId);
    
    if (userFilesError) {
      console.error('Error listing user files:', userFilesError);
    } else {
      console.log('User files:', userFiles);
    }
    
    // Check bucket policies
    const { data: policies, error: policiesError } = await supabase.rpc('get_policies', {
      schema_name: 'storage',
      table_name: 'objects'
    });
    
    if (policiesError) {
      console.error('Error fetching policies:', policiesError);
    } else {
      console.log('Storage policies:', policies);
    }
    
    return {
      canListBucket: !bucketError,
      canListUserFiles: !userFilesError,
      policies: policies || []
    };
  } catch (error) {
    console.error('Error checking storage permissions:', error);
    throw error;
  }
}

export async function forceDeleteFile(bucketName: string, filePath: string) {
  try {
    console.log(`Attempting to force delete: ${filePath}`);
    
    // First try the normal way
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
    
    if (deleteError) {
      console.warn('Normal delete failed, trying alternative method...', deleteError);
      
      // If normal delete fails, try to delete using the admin API
      const { error: adminDeleteError } = await supabase.rpc('delete_storage_object', {
        bucket: bucketName,
        path: filePath
      });
      
      if (adminDeleteError) {
        throw adminDeleteError;
      }
    }
    
    console.log('File successfully deleted');
    return true;
  } catch (error) {
    console.error('Force delete failed:', error);
    throw error;
  }
}
