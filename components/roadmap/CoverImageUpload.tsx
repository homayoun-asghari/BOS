'use client';

import { useState, useCallback, ChangeEvent } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadRoadmapCover, deleteRoadmapCover } from '@/lib/supabase/storage-utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CoverImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
  aspectRatio?: '16/9' | '4/3' | '1/1';
}

export function CoverImageUpload({
  value,
  onChange,
  onRemove,
  disabled = false,
  className = '',
  aspectRatio = '16/9',
}: CoverImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      
      try {
        // Upload the file to storage
        const { url, path } = await uploadRoadmapCover(file);
        
        // Update the form with the new URL
        onChange(url);
        setPreviewUrl(url);
        
        toast.success('Cover image uploaded successfully');
      } catch (error) {
        console.error('Error uploading cover image:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to upload cover image');
      } finally {
        setIsUploading(false);
        // Reset the file input
        e.target.value = '';
      }
    },
    [onChange]
  );

  const handleRemove = useCallback(async () => {
    if (!value) return;
    
    try {
      // Extract the path from the URL
      const url = new URL(value);
      const path = url.pathname.split('/').slice(3).join('/'); // Remove the /storage/v1/object/public/roadmap-covers/ prefix
      
      // Delete the file from storage
      await deleteRoadmapCover(path);
      
      // Update the form
      if (onRemove) onRemove();
      setPreviewUrl(null);
      
      toast.success('Cover image removed');
    } catch (error) {
      console.error('Error removing cover image:', error);
      toast.error('Failed to remove cover image');
    }
  }, [value, onRemove]);

  const aspectRatioClasses = {
    '16/9': 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '1/1': 'aspect-square',
  }[aspectRatio];

  return (
    <div className={cn('space-y-2 w-full', className)}>
      {previewUrl ? (
        <div className="relative group">
          <div className={cn(
            'relative overflow-hidden rounded-lg border border-border bg-muted',
            aspectRatioClasses
          )}>
            <img
              src={previewUrl}
              alt="Roadmap cover"
              className="w-full h-full object-cover"
            />
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-none w-8 h-8 flex items-center justify-center"
              onClick={handleRemove}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove cover image</span>
            </Button>
          )}
        </div>
      ) : (
        <label
          className={cn(
            'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors',
            disabled && 'opacity-50 cursor-not-allowed',
            aspectRatioClasses
          )}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || isUploading}
          />
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-muted-foreground">
            <ImageIcon className="w-8 h-8 mb-2" />
            <p className="text-sm">
              <span className="font-medium text-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs">PNG, JPG, or WebP (max. 5MB)</p>
          </div>
        </label>
      )}
      {isUploading && (
        <p className="text-sm text-muted-foreground text-center">Uploading...</p>
      )}
    </div>
  );
}
