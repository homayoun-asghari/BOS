"use client";

import { useRef, useEffect, useState } from 'react';
import { Video, Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoPostProps {
  preview: string | null;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onFileChange: (file: File) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  category: 'roadmap' | 'milestone' | 'task';
}

export function VideoPost({ 
  preview, 
  isRecording, 
  onStartRecording, 
  onStopRecording, 
  onFileChange,
  videoRef,
  category 
}: VideoPostProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileChange(selectedFile);
    }
  };

  return (
    <div className="relative w-full h-full max-h-[90vh] aspect-[9/16] mx-auto bg-black/50 rounded-2xl overflow-hidden backdrop-blur-md">
      <video 
        ref={videoRef}
        className="w-full h-full object-cover bg-black"
        playsInline
        muted
      />
      
      {!preview && !isRecording && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
          <Video className="h-12 w-12 text-white/80 mb-4" />
          <p className="text-white/80 mb-6">
            Record a 15-second video or choose from gallery
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={onStartRecording}
              className="gap-2 bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              <Camera className="h-4 w-4" />
              Record
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
              capture={isMobile ? 'environment' : undefined}
            />
          </div>
        </div>
      )}
      
      {preview && !isRecording && (
        <video 
          src={preview} 
          controls 
          className="w-full h-full object-contain bg-black"
        />
      )}
      
      {isRecording && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <Button
            onClick={onStopRecording}
            className="bg-red-600 hover:bg-red-700 rounded-full h-12 w-12 p-0"
          >
            <div className="h-4 w-4 bg-white rounded-sm" />
          </Button>
        </div>
      )}
    </div>
  );
}
