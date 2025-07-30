"use client";

import { useRef, useEffect, useState } from 'react';
import { Video, Camera, Upload, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoPostProps {
  preview: string | null;
  isRecording: boolean;
  onStartRecording: () => void;
  onStartMediaRecording?: () => void; // New prop to actually start recording
  onStopRecording: () => void;
  onFileChange: (file: File) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  category: 'roadmap' | 'milestone' | 'task';
}

export function VideoPost({ 
  preview, 
  isRecording, 
  onStartRecording, 
  onStartMediaRecording,
  onStopRecording, 
  onFileChange,
  videoRef
}: Omit<VideoPostProps, 'category'>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [recordingActive, setRecordingActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileChange(selectedFile);
    }
  };

  const handleCameraClick = () => {
    // Just calls onStartRecording which gets the camera stream but doesn't start recording yet
    onStartRecording();
  };

  const handleStartRecording = () => {
    // Start actual recording
    if (onStartMediaRecording) {
      onStartMediaRecording();
    }
    setRecordingActive(true);
    // Start countdown from 30 seconds
    setTimeRemaining(30);
    
    // Set up timer to count down and automatically stop recording
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // When time reaches 0, stop recording and clear interval
          if (timerRef.current) clearInterval(timerRef.current);
          onStopRecording();
          setRecordingActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStopRecording = () => {
    // Stop the timer
    if (timerRef.current) clearInterval(timerRef.current);
    // Stop recording
    onStopRecording();
    setRecordingActive(false);
  };
  
  // Clean up timer on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-full max-h-[90vh] aspect-[9/16] mx-auto bg-black/50 rounded-2xl overflow-hidden backdrop-blur-md">
      {/* Video element that shows the camera feed during recording */}
      <div className="w-full h-full bg-black">
        <video 
          ref={videoRef}
          className={`w-full h-full ${isRecording ? 'object-cover' : 'object-contain'}`}
          playsInline
          autoPlay
          muted
          style={{
            display: (!isRecording && !preview) ? 'none' : 'block',
            backgroundColor: 'black'
          }}
        />
      </div>
      
      {!preview && !isRecording ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
          <Video className="h-12 w-12 text-white/80 mb-4" />
          <p className="text-white/80 mb-6">
            Record a video or choose from gallery
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={handleCameraClick}
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
      ) : null}
      
      {/* Camera view with preview but not yet recording */}
      {!recordingActive && isRecording && !preview ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex-1 flex items-center justify-center">
            <Button
              onClick={handleStartRecording}
              className="rounded-full h-16 w-16 flex items-center justify-center bg-red-600 hover:bg-red-700"
            >
              <PlayCircle className="h-8 w-8 text-white" />
              <span className="sr-only">Start Recording</span>
            </Button>
          </div>
          <p className="text-white/80 mb-6">Tap to start recording</p>
        </div>
      ) : null}
      
      {/* Preview overlay */}
      {preview && !isRecording && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
          <video 
            src={preview} 
            controls 
            className="w-full h-full object-contain"
            autoPlay
            loop
          />
        </div>
      )}
      
      {recordingActive && (
        <>
          <div className="absolute top-4 left-0 right-0 flex justify-center">
            <div className="bg-black/50 text-white rounded-full px-4 py-1 font-bold">
              {timeRemaining}s
            </div>
          </div>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <Button
              onClick={handleStopRecording}
              className="bg-red-600 hover:bg-red-700 rounded-full h-12 w-12 p-0"
            >
              <div className="h-4 w-4 bg-white rounded-sm" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
