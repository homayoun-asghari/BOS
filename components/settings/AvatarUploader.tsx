'use client';

import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera, Trash2 } from 'lucide-react';

interface AvatarUploaderProps {
  currentAvatarUrl: string;
  onAvatarChange: (file: File | null) => void;
  isSaving?: boolean;
}

export function AvatarUploader({ 
  currentAvatarUrl,
  onAvatarChange,
  isSaving = false
}: AvatarUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onAvatarChange(file);
      // Reset the input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = () => {
    setPreviewUrl('');
    onAvatarChange(null);
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;
  const userInitial = 'U';

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative h-28 w-28">
        <Avatar className="h-full w-full border-2 border-border">
          {isSaving ? (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : displayUrl ? (
            <AvatarImage src={displayUrl} alt="User avatar" className="object-cover" />
          ) : (
            <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-medium">
              {userInitial}
            </AvatarFallback>
          )}
        </Avatar>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
          disabled={isSaving}
        />
        
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1 bg-background/50 backdrop-blur-sm p-1 rounded-full border border-border/30">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-transparent hover:bg-foreground/10 transition-all"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSaving}
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-transparent hover:bg-foreground/10 transition-all"
            onClick={handleDelete}
            disabled={isSaving || (!currentAvatarUrl && !previewUrl)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground text-center">
        Click on the avatar to upload a new one
      </p>
    </div>
  );
}
