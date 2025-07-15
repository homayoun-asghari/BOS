"use client";

import { useRef } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImagePostProps {
  preview: string | null;
  onFileChange: (file: File) => void;
  category: 'roadmap' | 'milestone' | 'task';
}

export function ImagePost({ preview, onFileChange, category }: ImagePostProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileChange(selectedFile);
    }
  };

  return (
    <div className="relative w-full h-full max-h-[90vh] aspect-[9/16] mx-auto bg-black/50 rounded-2xl overflow-hidden backdrop-blur-md">
      {preview ? (
        <img 
          src={preview} 
          alt="Preview" 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            {typeof window !== 'undefined' && window.innerWidth < 640 
              ? 'Take a photo or choose from gallery' 
              : 'Upload an image'}
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {typeof window !== 'undefined' && window.innerWidth < 640 ? 'Choose Photo' : 'Choose File'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            capture={typeof window !== 'undefined' && window.innerWidth < 640 ? 'environment' : undefined}
          />
        </div>
      )}
    </div>
  );
}
