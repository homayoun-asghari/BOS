"use client";

import { useRef, useState, useEffect } from 'react';
import { Image as ImageIcon, Upload, Camera } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface ImagePostProps {
  preview: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement> | File) => void;
  category?: 'roadmap' | 'milestone' | 'task';
}

export function ImagePost({ preview: initialPreview, onFileChange }: Omit<ImagePostProps, 'category'>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [preview, setPreview] = useState<string | null>(initialPreview || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | File) => {
    let file: File | null = null;
    let isEvent = false;
    
    if (e instanceof File) {
      file = e;
      isEvent = false;
    } else {
      file = e.target.files?.[0] || null;
      isEvent = true;
    }
    
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    
    // Call onFileChange with the appropriate argument based on input type
    if (isEvent) {
      // If it was an event, pass it through directly
      onFileChange(e as React.ChangeEvent<HTMLInputElement>);
    } else {
      // If it was a File, create a mock event for backward compatibility
      const mockEvent = {
        target: { files: [file] },
        preventDefault: () => {},
        stopPropagation: () => {}
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      onFileChange(mockEvent);
    }
  };

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      const constraints = { video: true, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCapturing(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      fileInputRef.current?.click(); // fallback
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    streamRef.current = null;
    setIsCapturing(false);
  };

  const captureImage = async () => {
    if (!videoRef.current) return;

    // Target dimensions for 9:16 aspect ratio
    const targetWidth = 1080; // You can adjust this based on your needs
    const targetHeight = Math.round((targetWidth * 16) / 9);
    
    const video = videoRef.current;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    // Calculate source rectangle to maintain aspect ratio
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = videoWidth;
    let sourceHeight = videoHeight;
    
    // Calculate the aspect ratios
    const videoAspect = videoWidth / videoHeight;
    const targetAspect = 9 / 16;
    
    // Determine which dimension to crop
    if (videoAspect > targetAspect) {
      // Video is wider than target, crop width
      sourceWidth = Math.round(videoHeight * targetAspect);
      sourceX = Math.round((videoWidth - sourceWidth) / 2);
    } else {
      // Video is taller than target, crop height
      sourceHeight = Math.round(videoWidth / targetAspect);
      sourceY = Math.round((videoHeight - sourceHeight) / 2);
    }
    
    // Create canvas with target dimensions
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Draw the image to the canvas with crop and resize
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      video,
      sourceX, sourceY, sourceWidth, sourceHeight, // source rectangle
      0, 0, targetWidth, targetHeight              // destination rectangle
    );
    ctx.restore();
    
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.9);
    });

    if (!blob) return;

    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    
    // Call handleFileChange directly with the file
    handleFileChange(file);
    
    stopCamera();
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    setPreview(initialPreview);
  }, [initialPreview]);

  return (
    <div className="relative w-full h-full max-h-[90vh] aspect-[9/16] mx-auto bg-black/50 rounded-2xl overflow-hidden backdrop-blur-md">
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${isCapturing ? '' : 'hidden'}`}
        playsInline
        autoPlay
        muted
        style={{ transform: 'scaleX(-1)' }}
      />

      {isCapturing ? (
        <div className="absolute inset-0 flex flex-col">
          <div className="flex-1" />
          <div className="bg-gradient-to-t from-black/80 to-transparent p-6 flex flex-col items-center">
            <Button
              onClick={captureImage}
              className="bg-white hover:bg-gray-200 rounded-full h-16 w-16 p-0 shadow-lg"
            >
              <div className="h-6 w-6 rounded-full bg-red-500" />
            </Button>
            <p className="text-white/80 text-sm mt-2">Center your face</p>
          </div>
        </div>
      ) : preview ? (
        <div className="relative w-full h-full bg-black/5 border border-gray-300 rounded-lg overflow-hidden">
          <Image
            src={preview}
            alt="Preview"
            fill
            crossOrigin="anonymous"
            className="object-contain"
            onError={() => console.error("Preview load failed:", preview)}
            onLoad={() => console.log("Image preview loaded")}
          />
          <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/70 to-transparent p-2 text-center text-white text-sm">
            Preview of your image
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-6">
            {typeof window !== 'undefined' && window.innerWidth < 640 
              ? 'Take a photo or choose from gallery' 
              : 'Upload an image or take a photo'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
            <Button onClick={startCamera} className="gap-2 flex-1">
              <Camera className="h-4 w-4" /> Take Photo
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} className="gap-2 flex-1">
              <Upload className="h-4 w-4" /> Upload
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileChange}
            className="hidden"
            capture="environment"
          />
        </div>
      )}
    </div>
  );
}
