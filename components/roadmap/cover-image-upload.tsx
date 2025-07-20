'use client';

import { useCallback, useRef, useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { uploadRoadmapCover, deleteRoadmapCover } from '@/lib/supabase/storage-utils';

export interface CoverImage {
  url: string;
  path: string;
}

interface CoverImageUploadProps {
  coverImage: CoverImage | null;
  onCoverImageChange: (coverImage: CoverImage | null) => void;
  onPendingRemovalChange?: (pending: boolean) => void;
  className?: string;
}

export function CoverImageUpload({
  coverImage,
  onCoverImageChange,
  onPendingRemovalChange,
  className = '',
}: CoverImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setIsUploading(true);

      try {
        // Delete old cover image if exists
        if (coverImage?.path) {
          console.log('Deleting old cover image:', coverImage.path);
          const deleted = await deleteRoadmapCover(coverImage.path);
          if (!deleted) {
            console.warn('Failed to delete old cover image, but continuing with upload');
          }
        }

        // Upload the image directly
        const { url, path } = await uploadRoadmapCover(file);
        onCoverImageChange({ url, path });
        onPendingRemovalChange?.(false);
        toast.success('Cover image uploaded successfully');
      } catch (error) {
        console.error('Error uploading cover image:', error);
        toast.error('Failed to upload cover image');
      } finally {
        setIsUploading(false);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [coverImage, onCoverImageChange, onPendingRemovalChange]
  );

  const handleRemoveCover = useCallback(() => {
    if (!coverImage) return;

    // Just update the local state immediately
    onCoverImageChange(null);
    onPendingRemovalChange?.(true);
    toast.success('Cover image will be removed when you save changes');
  }, [coverImage, onCoverImageChange, onPendingRemovalChange]);

  return (
    <div className={className}>
      {coverImage ? (
        <div className="relative group">
          <img
            src={coverImage.url}
            alt="Cover"
            className="w-full h-48 object-cover rounded-lg"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background/90 text-foreground hover:text-foreground border-border"
            onClick={handleRemoveCover}
            disabled={isUploading}
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-2">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Add a cover image (optional)
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
