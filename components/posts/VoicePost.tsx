'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/utils/date';
import WaveSurfer from 'wavesurfer.js';

interface VoicePostProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  maxDuration?: number; // in seconds
}

export function VoicePost({ onRecordingComplete, maxDuration = 30 }: VoicePostProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // Use a more specific type for the audio data array
  const dataArrayRef = useRef<Uint8Array | null>(null);
  // animationFrameRef is now managed by the useEffect
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Using ReturnType<typeof setTimeout> for cross-environment compatibility
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stop recording function
  const stopRecording = useCallback((): void => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  // Initialize audio context and analyser
  useEffect(() => {
    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
      stopRecording();
    };
  }, [stopRecording]);

  const startRecording = async (): Promise<void> => {
    try {
      // Clean up any existing recording
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }
      
      // Stop any existing tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Reset state
      chunksRef.current = [];
      setElapsedTime(0);
      setCurrentTime(0);
      
      // Get new media stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Set up audio context and analyser for visualization
      // Extend Window interface to include webkitAudioContext
      interface Window {
        webkitAudioContext: typeof AudioContext;
      }
      
      const audioContext = new (window.AudioContext || (window as unknown as Window).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      // Create a Uint8Array with a fixed-length buffer for the analyzer
      const buffer = new ArrayBuffer(bufferLength);
      dataArrayRef.current = new Uint8Array(buffer);
      
      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
          setAudioBlob(audioBlob);
          setAudioUrl(URL.createObjectURL(audioBlob));
          onRecordingComplete(audioBlob);
        }
      };
      
      // Start recording with timer reset
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      startTimer(true); // Always reset timer when starting a new recording
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      mediaRecorderRef.current.resume();
      startTimer(false); // Don't reset timer when resuming from pause
    } else {
      mediaRecorderRef.current.pause();
      stopTimer();
    }
    
    setIsPaused(!isPaused);
  };

  const startTimer = (reset = true): void => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // If reset is true, start from zero, otherwise continue from current elapsedTime
    const startTime = reset ? Date.now() : Date.now() - (elapsedTime * 1000);
    
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
      
      if (elapsed >= maxDuration) {
        stopRecording();
      }
    }, 100);
  };

  const stopTimer = (): void => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Handle cancel is now directly using onCancel prop

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || !containerRef.current || !audioUrl) return;

    let wavesurfer: WaveSurfer | null = null;
    let isMounted = true;
    let controller: AbortController | null = null;
    
    // Define WaveSurfer event handler types
    // Use a broad Record to align with WaveSurfer's string-based event API
    type WaveSurferEventHandlers = Record<string, (...args: unknown[]) => void>;

    const initWaveSurfer = async () => {
      try {
        // Create WaveSurfer instance with transparent background
        wavesurfer = WaveSurfer.create({
          container: waveformRef.current!,
          waveColor: 'rgba(239, 68, 68, 0.4)',
          progressColor: 'rgba(239, 68, 68, 0.7)',
          cursorColor: 'transparent',
          barWidth: 2,
          barRadius: 3,
          cursorWidth: 0, // Hide cursor line
          height: 80,
          barGap: 2,
          // @ts-expect-error - 'responsive' is not in current WaveSurfer types but is used for our runtime behavior
          responsive: true,
          normalize: true,
          partialRender: true,
          hideScrollbar: true,
          backgroundColor: 'transparent',
          interact: true,
          barMinHeight: 2,
          barHeight: 1,
          barAlign: 'bottom',
          fillParent: true,
          autoCenter: true,
          autoCenterImmediately: true
        });

        // Set up event listeners
        const eventHandlers: WaveSurferEventHandlers = {
          ready: () => {
            if (!isMounted || !wavesurfer) return;
            const duration = wavesurfer.getDuration();
            setDuration(duration);
            wavesurfer.setVolume(1);
            wavesurferRef.current = wavesurfer;
          },
          audioprocess: () => {
            if (!isMounted || !wavesurfer) return;
            setCurrentTime(wavesurfer.getCurrentTime());
          },
          seek: () => {
            if (!isMounted || !wavesurfer) return;
            setCurrentTime(wavesurfer.getCurrentTime());
          },
          finish: () => setIsPlaying(false),
          pause: () => setIsPlaying(false),
          play: () => {
            if (!wavesurfer) return;
            setCurrentTime(wavesurfer.getCurrentTime());
            setIsPlaying(true);
          },
          error: (...args: unknown[]) => {
            const err = args[0];
            if (err instanceof Error) {
              if (err.name !== 'AbortError') {
                console.error('WaveSurfer error:', err);
              }
            } else {
              console.error('WaveSurfer error:', err);
            }
          }
        };

        // Attach all event handlers with proper typing
        (Object.entries(eventHandlers) as Array<[string, (...args: unknown[]) => void]>).forEach(([eventName, callback]: [string, (...args: unknown[]) => void]) => {
          if (wavesurfer) {
            // @ts-expect-error - WaveSurfer types don't reflect dynamic event names uniformly across versions
            wavesurfer.on(eventName, callback);
          }
        });

        // Load the audio
        await wavesurfer.load(audioUrl);

      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error initializing WaveSurfer:', error);
        }
      }
    };

    initWaveSurfer();

    // Clean up function
    return () => {
      isMounted = false;
      
      // Abort any pending requests
      if (controller) {
        controller.abort();
        controller = null;
      }
      
      // Destroy WaveSurfer instance
      if (wavesurfer) {
        try {
          wavesurfer.unAll();
          if (wavesurfer.isPlaying?.()) {
            wavesurfer.pause();
          }
          const ws = wavesurfer; // Capture in closure
          setTimeout(() => {
            try {
              ws.destroy();
            } catch (error) {
              console.error('Error destroying WaveSurfer:', error);
            }
          }, 0);
        } catch (error) {
          console.error('Error cleaning up WaveSurfer:', error);
        }
      }
      
      wavesurferRef.current = null;
    };
  }, [audioUrl]);

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.playPause();
  };

  // Handle seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wavesurferRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    if (!container || !wavesurferRef.current) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const seekRatio = Math.min(Math.max(0, x / rect.width), 1); // Clamp between 0 and 1
    const seekTime = seekRatio * duration;
    
    wavesurferRef.current.seekTo(seekTime);
    setCurrentTime(seekTime);
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Handle canvas drawing
  useEffect(() => {
    if (!isRecording || !analyserRef.current || !dataArrayRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;
      
      // Create a new Uint8Array view of the buffer to ensure type compatibility
      const dataArray = new Uint8Array(dataArrayRef.current.buffer as ArrayBuffer);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, width, height);
      
      const barWidth = 2;
      const barSpacing = 1;
      const barCount = Math.floor(width / (barWidth + barSpacing));
      
      for (let i = 0; i < barCount; i++) {
        const barHeight = (dataArrayRef.current[Math.floor(i * dataArrayRef.current.length / barCount)] / 255) * height;
        const x = i * (barWidth + barSpacing);
        
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x, (height - barHeight) / 2, barWidth, barHeight);
      }
      
      animationFrameIdRef.current = requestAnimationFrame(draw);
    };
    
    draw();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isRecording]);

  return (
    <div className="relative w-full aspect-[9/16] bg-black/5 rounded-lg overflow-hidden flex flex-col items-center justify-center p-6">
      
      {!isRecording && !audioUrl ? (
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="bg-red-100 p-4 rounded-full">
            <Mic className="h-10 w-10 text-red-600" />
          </div>
          <h3 className="text-lg font-medium">Record Voice Note</h3>
          <p className="text-sm text-gray-500">Tap the button below to start recording (max {maxDuration}s)</p>
          <Button 
            onClick={startRecording}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white"
          >
            Start Recording
          </Button>
        </div>
      ) : isRecording ? (
        <div className="flex flex-col items-center justify-center w-full">
          <div className="w-full max-w-md">
            <div className="w-full p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
                    <Mic className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {formatTime(elapsedTime)} / {formatTime(maxDuration)}
                  </div>
                </div>
                <div className="text-xs text-white bg-red-500 rounded-full px-2 py-1">
                  {isPaused ? 'Paused' : 'Recording...'}
                </div>
              </div>
              
              {/* Waveform visualization during recording */}
              <div className="w-full h-16 -mx-2">
                <div className="w-full h-full">
                  <canvas 
                    ref={canvasRef} 
                    width={300} 
                    height={64}
                    className="w-full h-full"
                  />
                </div>
              </div>
              
              <div className="mt-2">
                <div className="text-sm text-center text-muted-foreground">
                  {isPaused ? 'Paused • Tap resume to continue' : 'Recording in progress...'}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <Button
                variant="outline"
                onClick={togglePause}
                className="rounded-full px-6"
              >
                {isPaused ? (
                  <Play className="h-4 w-4 mr-2" />
                ) : (
                  <Pause className="h-4 w-4 mr-2" />
                )}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              
              <Button
                onClick={stopRecording}
                className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full">
          <div className="w-full max-w-md">
            <div className="w-full p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={togglePlayPause}
                    className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200 transition-colors flex-shrink-0"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5 text-red-600" />
                    ) : (
                      <Play className="h-5 w-5 text-red-600 ml-0.5" />
                    )}
                  </button>
                  <div className="text-sm font-medium text-foreground">
                    {formatTime(currentTime)} / {formatTime(duration || elapsedTime)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round((audioBlob?.size || 0) / 1024)} KB
                </div>
              </div>
              
              {/* Waveform container */}
              <div 
                ref={containerRef}
                className="w-full h-16 -mx-2 cursor-pointer"
                onClick={handleSeek}
              >
                <div 
                  ref={waveformRef}
                  className="w-full h-full"
                />
              </div>
              
              <div className="mt-2">
                <div className="text-sm text-center text-muted-foreground">
                  Recording complete • {formatTime(elapsedTime)}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  // Clear any existing audio data
                  setAudioBlob(null);
                  setAudioUrl('');
                  // Start a fresh recording
                  startRecording();
                }}
                className="rounded-full px-6"
              >
                <Mic className="h-4 w-4 mr-2" />
                Record Again
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
