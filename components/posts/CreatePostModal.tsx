"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Type, Image as ImageIcon, Video, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextPost } from './TextPost';
import { ImagePost } from './ImagePost';
import { VideoPost } from './VideoPost';

type UserItem = {
  id: string;
  title: string;
  type: 'roadmap' | 'milestone' | 'task';
  // Add other properties as needed
};

type PostType = 'text' | 'image' | 'video' | null;

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (post: { type: PostType; content: string | File | null }) => void;
}

// Mock data - replace with actual data fetching
const mockUserItems: UserItem[] = [
  { id: '1', title: 'Product Launch Plan', type: 'roadmap' },
  { id: '2', title: 'Q3 Marketing Strategy', type: 'roadmap' },
  { id: '3', title: 'Complete User Authentication', type: 'milestone' },
  { id: '4', title: 'Design New Dashboard', type: 'milestone' },
  { id: '5', title: 'Fix Login Bug', type: 'task' },
  { id: '6', title: 'Update Documentation', type: 'task' },
];

export function CreatePostModal({ isOpen, onClose, onSubmit }: CreatePostModalProps) {
  const [type, setType] = useState<PostType>(null);
  const [selectedItems, setSelectedItems] = useState<{
    roadmap: UserItem | null;
    milestone: UserItem | null;
    task: UserItem | null;
  }>({
    roadmap: null,
    milestone: null,
    task: null
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isMaxLength, setIsMaxLength] = useState(false);

  // Cleanup media stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  // File change is handled in the respective components (ImagePost, VideoPost)

  const handleItemSelect = useCallback((item: UserItem) => {
    setSelectedItems(prev => ({
      ...prev,
      [item.type]: prev[item.type]?.id === item.id ? null : item
    }));
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        },
        audio: true 
      });
      
      setMediaStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        setPreview(videoUrl);
        setFile(new File([blob], 'recorded-video.webm', { type: 'video/webm' }));
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      
      // Auto stop after 15 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecording(false);
          
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        }
      }, 15000);
      
    } catch (err) {
      console.error('Error accessing media devices:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const hasRequiredSelections = useCallback(() => {
    return !!selectedItems.roadmap && !!selectedItems.milestone;
  }, [selectedItems]);

  const getCategory = useCallback((): 'roadmap' | 'milestone' | 'task' => {
    return selectedItems.roadmap?.type || selectedItems.milestone?.type || 'roadmap';
  }, [selectedItems]);

  const handleSubmit = useCallback(() => {
    if (!type || !hasRequiredSelections()) return;
    
    const postData = {
      type,
      content: type === 'text' ? text : preview || '',
      file,
      items: selectedItems
    } as const;
    
    onSubmit(postData);
    onClose();
  }, [type, selectedItems, text, preview, file, onSubmit, onClose, hasRequiredSelections]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const resetForm = () => {
    setType(null);
    setText('');
    setFile(null);
    setPreview(null);
    setIsRecording(false);
    chunksRef.current = [];
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-md">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 z-10 text-white/80 hover:text-white transition-colors bg-black/50 rounded-full p-2"
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="h-full flex flex-col p-4">
          {type === null ? (
            <h2 className="text-2xl font-bold mb-8 text-white text-center">Create New Post</h2>
          ) : (
            <button 
              onClick={() => {
                resetForm();
                setType(null);
              }}
              className="absolute left-6 top-6 z-10 text-white/80 hover:text-white transition-colors bg-black/50 rounded-full p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="m12 19-7-7 7-7"/>
                <path d="M19 12H5"/>
              </svg>
            </button>
          )}
          
          {type === null ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="flex justify-center gap-4 w-full">
                  <Button
                    variant={type === 'text' ? 'default' : 'outline'}
                    onClick={() => setType('text')}
                    className="gap-2 flex-1"
                    disabled={!hasRequiredSelections()}
                  >
                    <Type className="h-4 w-4" />
                    Text
                  </Button>
                  <Button
                    variant={type === 'image' ? 'default' : 'outline'}
                    onClick={() => setType('image')}
                    className="gap-2 flex-1"
                    disabled={!hasRequiredSelections()}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Image
                  </Button>
                  <Button
                    variant={type === 'video' ? 'default' : 'outline'}
                    onClick={() => setType('video')}
                    className="gap-2 flex-1"
                    disabled={!hasRequiredSelections()}
                  >
                    <Video className="h-4 w-4" />
                    Video
                  </Button>
                </div>
                <div className="relative w-full space-y-1" ref={dropdownRef}>
                  <span className="text-sm font-medium text-gray-700">
                    Select Roadmap and Milestone <span className="text-red-500">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium ${
                      !hasRequiredSelections() ? 'text-gray-400' : 'text-gray-700'
                    } bg-white border ${
                      !hasRequiredSelections() ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                  >
                    <span className="text-left">
                      {Object.values(selectedItems).some(Boolean) ? (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(selectedItems).map(([type, item]) =>
                            item ? (
                              <span key={`${type}-${item.id}`} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {item.title}
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleItemSelect(item);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      handleItemSelect(item);
                                    }
                                  }}
                                  className="ml-1.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 cursor-pointer"
                                  aria-label={`Remove ${item.title}`}
                                >
                                  ×
                                </span>
                              </span>
                            ) : null
                          )}
                        </div>
                      ) : (
                        'Select a roadmap, milestone, or task'
                      )}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2 -mr-1 text-gray-400" />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                      <div className="max-h-60 overflow-y-auto py-1">
                        {['roadmap', 'milestone', 'task'].map((itemType) => {
                          const items = mockUserItems.filter(item => item.type === itemType);
                          if (items.length === 0) return null;
                          
                          return (
                            <div key={itemType}>
                              <div className="sticky top-0 z-10 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                                {itemType}s
                              </div>
                              {items.map((item) => {
                                const isSelected = selectedItems[itemType as keyof typeof selectedItems]?.id === item.id;
                                return (
                                  <label
                                    key={item.id}
                                    className={`flex items-center px-4 py-2 text-sm cursor-pointer ${
                                      isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                      checked={isSelected}
                                      onChange={() => handleItemSelect(item)}
                                    />
                                    <span className="ml-3 text-gray-700">
                                      {item.type === 'roadmap' && '🗺️ '}
                                      {item.type === 'milestone' && '🎯 '}
                                      {item.type === 'task' && '✅ '}
                                      {item.title}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {type === 'text' ? (
                <TextPost 
                  text={text}
                  onChange={setText}
                  isMaxLength={isMaxLength}
                  category={getCategory()}
                />
              ) : type === 'image' ? (
                <ImagePost 
                  preview={preview}
                  onFileChange={(file) => {
                    setFile(file);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setPreview(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }}
                  category={getCategory()}
                />
              ) : (
                <VideoPost
                  preview={preview}
                  isRecording={isRecording}
                  onStartRecording={startRecording}
                  onStopRecording={stopRecording}
                  onFileChange={(file) => {
                    setFile(file);
                    const videoUrl = URL.createObjectURL(file);
                    setPreview(videoUrl);
                  }}
                  videoRef={videoRef as React.RefObject<HTMLVideoElement>}
                  category={getCategory()}
                />
              )}
              
              {/* Post (Send) Button - Matches right panel FAB */}
              <div className="fixed bottom-6 right-5 z-30">
                <button
                  onClick={handleSubmit}
                  disabled={!preview && !text || !hasRequiredSelections()}
                  className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-colors ${
                    (!preview && !text) || !hasRequiredSelections()
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                  aria-label="Post"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="h-5 w-5"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z"/>
                    <path d="M22 2 11 13"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
