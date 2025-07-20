'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/utils/date';
import WaveSurfer from 'wavesurfer.js';

interface VoicePostProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds
}

export function VoicePost({ onRecordingComplete, onCancel, maxDuration = 30 }: VoicePostProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  // animationFrameRef is now managed by the useEffect
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();

  // Initialize audio context and analyser
  useEffect(() => {
    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
      // Animation frame cleanup is now handled by the useEffect
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    try {
      // Clean up any existing recording
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
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
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
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

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      stopTimer();
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

  const startTimer = (reset = true) => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
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

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleCancel = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopRecording();
    onCancel();
  };

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || !containerRef.current || !audioUrl) return;

    let wavesurfer: any = null;
    let isMounted = true;
    let controller: AbortController | null = null;

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
        const onReady = () => {
          if (!isMounted) return;
          const duration = wavesurfer.getDuration();
          setDuration(duration);
          wavesurfer.setVolume(1);
          wavesurferRef.current = wavesurfer;
        };

        const onAudioProcess = () => {
          if (!isMounted || !wavesurfer) return;
          setCurrentTime(wavesurfer.getCurrentTime());
        };

        const onSeek = () => {
          if (!isMounted || !wavesurfer) return;
          setCurrentTime(wavesurfer.getCurrentTime());
        };

        wavesurfer.on('ready', onReady);
        wavesurfer.on('audioprocess', onAudioProcess);
        wavesurfer.on('seek', onSeek);
        wavesurfer.on('finish', () => setIsPlaying(false));
        wavesurfer.on('pause', () => setIsPlaying(false));
        wavesurfer.on('play', () => {
          // Ensure we have the latest time when playback starts
          setCurrentTime(wavesurfer.getCurrentTime());
          setIsPlaying(true);
        });
        wavesurfer.on('error', (error: any) => {
          if (error.name !== 'AbortError') {
            console.error('WaveSurfer error:', error);
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
          setTimeout(() => {
            wavesurfer.destroy();
            wavesurfer = null;
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
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const seekRatio = x / rect.width;
    const seekTime = seekRatio * duration;
    
    wavesurferRef.current.seekTo(seekTime);
    setCurrentTime(seekTime);
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number>();

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
      
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
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
