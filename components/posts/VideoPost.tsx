"use client";

import { useRef, useEffect, useState } from 'react';
import { Video, Camera, Upload, PlayCircle, Scissors, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
// Custom range input will be used instead of Slider

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
  const [isTrimming, setIsTrimming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [recordingActive, setRecordingActive] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30);
  const [videoDuration, setVideoDuration] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const trimVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          setVideoDuration(video.duration);
          setSelectedFile(file);
          setVideoUrl(url);
          setTrimStart(0);
          setTrimEnd(Math.min(30, video.duration));
          setIsTrimming(true);
          resolve();
        };
        video.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load video metadata'));
        };
        video.src = url;
      });
    } catch (error) {
      console.error('Error processing video:', error);
      alert('Error processing the video. Please try another file.');
    }
  };

  const handleTrimVideo = async () => {
    if (!trimVideoRef.current || !selectedFile || videoDuration <= 0 || isProcessing) return;
    setIsTrimming(true);
    
    const tempVideo = document.createElement('video');
    tempVideo.crossOrigin = 'anonymous';
    tempVideo.muted = false; // allow audio to flow into WebAudio graph
    tempVideo.src = videoUrl || '';
    
    try {
      // Wait for video metadata to load
      await new Promise<void>((resolve, reject) => {
        tempVideo.onloadedmetadata = () => resolve();
        tempVideo.onerror = () => reject(new Error('Failed to load video'));
      });
      
      // Set the start time and wait for seek
      tempVideo.currentTime = trimStart;
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          tempVideo.removeEventListener('seeked', onSeeked);
          resolve();
        };
        tempVideo.addEventListener('seeked', onSeeked);
      });
      
      // Create audio context for audio processing (capture audio even if element is muted)
      const AudioContextCtor =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error('AudioContext not supported');
      }
      const audioContext = new AudioContextCtor();
      const audioSource = audioContext.createMediaElementSource(tempVideo);
      const destination = audioContext.createMediaStreamDestination();
      audioSource.connect(destination);
      // Resume context to ensure audio is produced (autoplay policies may suspend it)
      try {
        await audioContext.resume();
      } catch (e) {
        console.warn('AudioContext resume failed', e);
      }
      
      // Create a canvas for video frames
      const canvas = document.createElement('canvas');
      canvas.width = tempVideo.videoWidth;
      canvas.height = tempVideo.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');
      
      // Combine video and audio streams
      const videoStream = canvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);
      
      // Choose a supported mime type for best compatibility
      const preferredTypes = [
        // Safari / iOS support
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=h264,aac',
        'video/mp4',
        // Chromium / Firefox
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
      const chosenType =
        preferredTypes.find((t) => {
          try {
            return (
              typeof MediaRecorder !== 'undefined' &&
              typeof MediaRecorder.isTypeSupported === 'function' &&
              MediaRecorder.isTypeSupported(t)
            );
          } catch {
            return false;
          }
        }) || preferredTypes[2];
      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType: chosenType });
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      return new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => {
          // Clean up
          videoStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
          destination.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
          audioContext.close();
          tempVideo.pause();
          tempVideo.src = '';
          
          const blobType = mediaRecorder.mimeType || chosenType || 'video/webm';
          const blob = new Blob(chunks, { type: blobType });
          const ext = blobType.includes('mp4') ? 'mp4' : 'webm';
          const base = selectedFile.name.replace(/\.[^/.]+$/, '');
          const trimmedFile = new File([blob], `${base}-trimmed.${ext}`, { type: blobType });
          
          onFileChange(trimmedFile);
          setIsTrimming(false);
          setIsProcessing(false);
          setIsTrimming(false);
          
          if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
            setVideoUrl(null);
          }
          
          resolve();
        };
        
        // Start recording
        setIsProcessing(true);
        mediaRecorder.start(100);
        
        // Start playing the video (muted) to capture audio
        const playPromise = tempVideo.play();
        if (playPromise !== undefined) {
          playPromise.catch(console.error);
        }
        
        // Draw frames and handle timing based on selected window (max 30s)
        const startTime = Date.now();
        const durationMs = Math.min(30, Math.max(0, trimEnd - trimStart)) * 1000;
        
        const drawFrame = () => {
          if (Date.now() - startTime >= durationMs) {
            mediaRecorder.stop();
            return;
          }
          
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(drawFrame);
        };
        
        // Start the process
        drawFrame();
      });
      
    } catch (error) {
      console.error('Error trimming video:', error);
      alert('Error processing the video. Please try again.');
      setIsTrimming(false);
      setIsProcessing(false);
      
      // Clean up
      tempVideo.pause();
      tempVideo.src = '';
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
      }
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
  
  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Clean up video URL if it exists
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      
      // Clean up any video elements we created
      const tempVideos = document.querySelectorAll('video.temp-trim-video');
      tempVideos.forEach((videoElement: Element) => {
        const video = videoElement as HTMLVideoElement;
        video.pause();
        video.src = '';
        video.remove();
      });
    };
  }, [videoUrl]);

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
      
      {/* Video trimming interface */}
      {isTrimming && videoUrl && (
        <div className="absolute inset-0 backdrop-blur-xl bg-black/60 flex flex-col z-50 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white text-lg font-semibold tracking-tight">Trim Video (up to 30s)</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                setIsTrimming(false);
                if (videoUrl) URL.revokeObjectURL(videoUrl);
              }}
              className="text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            <video
              ref={trimVideoRef}
              src={videoUrl}
              className="max-h-[60vh] max-w-full rounded-xl overflow-hidden border border-white/10 shadow-xl"
              controls
              playsInline
            />
          </div>
          
          <div className="mt-4 px-4 rounded-2xl bg-white/5 border border-white/10 py-4 shadow-xl">
            <div className="mb-2 text-white text-sm">
              Start time: {Math.floor(trimStart / 60)}:{(trimStart % 60).toString().padStart(2, '0')}
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(0, videoDuration - 0.1)}
              step="0.1"
              value={trimStart}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                setTrimStart(value);
                // Keep end within 30s window and after start
                setTrimEnd((prev) => {
                  let nextEnd = prev;
                  if (prev - value > 30) {
                    nextEnd = Math.min(videoDuration, value + 30);
                  }
                  if (prev <= value) {
                    nextEnd = Math.min(videoDuration, value + Math.min(30, videoDuration - value));
                  }
                  return nextEnd;
                });
                if (trimVideoRef.current) {
                  trimVideoRef.current.currentTime = value;
                }
              }}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />

            {/* Selection summary and visual timeline */}
            <div className="mt-3 flex items-center justify-between text-white/70 text-xs">
              <span>Start {Math.floor(trimStart / 60)}:{(trimStart % 60).toString().padStart(2, '0')}</span>
              <span>End {Math.floor(trimEnd / 60)}:{(trimEnd % 60).toString().padStart(2, '0')}</span>
              <span>
                Duration {Math.floor((trimEnd - trimStart) / 60)}:
                {Math.floor((trimEnd - trimStart) % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="mt-3">
              <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 bg-green-500/80"
                  style={{
                    left: `${videoDuration > 0 ? (trimStart / videoDuration) * 100 : 0}%`,
                    width: `${videoDuration > 0 ? Math.max(0, (trimEnd - trimStart) / videoDuration) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between text-white/60 text-xs mt-1">
              <span>0:00</span>
              <span>{Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')}</span>
            </div>

            <div className="mt-4 mb-2 text-white text-sm">
              End time: {Math.floor(trimEnd / 60)}:{(trimEnd % 60).toString().padStart(2, '0')}
            </div>
            <input
              type="range"
              min={trimStart}
              max={Math.min(videoDuration, trimStart + 30)}
              step="0.1"
              value={trimEnd}
              onChange={(e) => {
                let value = parseFloat(e.target.value);
                // Enforce 30s max window and ensure end > start
                if (value - trimStart > 30) value = trimStart + 30;
                if (value <= trimStart) value = Math.min(videoDuration, trimStart + 0.1);
                setTrimEnd(value);
                if (trimVideoRef.current) {
                  trimVideoRef.current.currentTime = value;
                }
              }}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            
            <div className="mt-6 flex justify-center">
              <Button 
                onClick={handleTrimVideo}
                disabled={isProcessing}
                className={`gap-2 rounded-full px-6 shadow-lg transition-colors ${isProcessing ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Scissors className="h-4 w-4" />
                    <span>Trim & Use This Segment</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Preview overlay */}
      {preview && !isRecording && !isTrimming && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
          <video 
            src={preview ?? undefined} 
            controls 
            className="w-full h-full object-contain"
            autoPlay
            playsInline
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
