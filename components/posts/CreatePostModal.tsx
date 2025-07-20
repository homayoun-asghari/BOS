"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Type, Image as ImageIcon, Video, Mic, ChevronDown, Loader2, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextPost } from './TextPost';
import { ImagePost } from './ImagePost';
import { VideoPost } from './VideoPost';
import { VoicePost } from './VoicePost';
import { usePosts } from '@/hooks/usePosts';
import { toast } from 'sonner';
import { uploadPostMedia } from '@/lib/supabase/storage-utils';
import { supabase } from '@/lib/supabase/client';

interface BaseUserItem {
  id: string;
  title: string;
  type: 'roadmap' | 'milestone' | 'task';
  parentId?: string;
}

interface RoadmapItem extends BaseUserItem {
  type: 'roadmap';
}

interface MilestoneItem extends BaseUserItem {
  type: 'milestone';
  parentId: string;
}

interface TaskItem extends BaseUserItem {
  type: 'task';
  parentId: string;
}

type UserItem = RoadmapItem | MilestoneItem | TaskItem;

type PostType = 'text' | 'image' | 'video' | 'voice' | null;

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (post: { type: PostType; content: string | File | null }) => void;
}

export function CreatePostModal({ isOpen, onClose }: Omit<CreatePostModalProps, 'onSubmit'>) {
  const [publicRoadmap, setPublicRoadmap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { createPost, isCreating } = usePosts();
  const { user: currentUser } = useAuth();
  
  // State for post content
  const [type, setType] = useState<PostType>(null);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null!); // Using non-null assertion
  const chunksRef = useRef<Blob[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Selected items state
  const [selectedItems, setSelectedItems] = useState<{
    roadmap: RoadmapItem | null;
    milestone: MilestoneItem | null;
    task: TaskItem | null;
  }>({
    roadmap: null,
    milestone: null,
    task: null
  });

  const resetForm = useCallback(() => {
    setText('');
    setPreview(null);
    setSelectedItems({
      roadmap: publicRoadmap ? {
        id: publicRoadmap.id,
        title: publicRoadmap.title || 'My Roadmap',
        type: 'roadmap' as const
      } : null,
      milestone: publicRoadmap?.milestones?.[0] ? {
        id: publicRoadmap.milestones[0].id,
        title: publicRoadmap.milestones[0].title,
        type: 'milestone' as const,
        parentId: publicRoadmap.id
      } : null,
      task: null
    });
    // Stop any ongoing media recording
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    // Stop media stream
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
  }, [publicRoadmap, isRecording, mediaStream]);
  
  // Fetch public roadmap data when component mounts
  useEffect(() => {
    const fetchPublicRoadmap = async () => {
      if (!currentUser?.id) {
        console.log('No current user ID, skipping roadmap fetch');
        return;
      }
      
      try {
        console.log('Fetching public roadmap for user:', currentUser.id);
        setIsLoading(true);
        const { data, error } = await supabase.rpc('get_current_roadmap', {
          user_id: currentUser.id,
          is_public_only: true
        });
        
        if (error) {
          console.error('Error fetching public roadmap:', error);
          throw error;
        }
        
        console.log('Received roadmap data:', data);
        if (data) {
          console.log('Fetched public roadmap data:', {
            id: data.id,
            title: data.title,
            final_goal: data.final_goal,
            milestones: data.milestones?.length || 0
          });
          setPublicRoadmap(data);
          
          // Auto-select the roadmap and first milestone if available
          if (data.milestones?.length > 0) {
            console.log('Setting selected items with roadmap and milestone:', {
              roadmap: {
                id: data.id,
                title: data.final_goal || 'My Roadmap'
              },
              milestone: {
                id: data.milestones[0].id,
                title: data.milestones[0].title
              }
            });
            setSelectedItems(prev => ({
              ...prev,
              roadmap: {
                id: data.id,
                title: data.final_goal || 'My Roadmap',
                type: 'roadmap' as const
              },
              milestone: {
                id: data.milestones[0].id,
                title: data.milestones[0].title,
                type: 'milestone' as const,
                parentId: data.id
              }
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching public roadmap:', error);
        toast.error('Failed to load roadmap data');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isOpen) {
      fetchPublicRoadmap();
    }
  }, [currentUser?.id, isOpen]);

  // Transform roadmap data into UserItem format
  const userItems = useMemo(() => {
    const items: UserItem[] = [];
    
    console.log('Transforming roadmap data into user items:', publicRoadmap);
    
    if (publicRoadmap) {
      // Add roadmap
      const roadmapItem: RoadmapItem = {
        id: publicRoadmap.id,
        title: publicRoadmap.final_goal || 'My Roadmap',
        type: 'roadmap' as const
      };
      items.push(roadmapItem);
      
      // Add milestones and tasks
      publicRoadmap.milestones?.forEach((milestone: any) => {
        const milestoneItem: MilestoneItem = {
          id: milestone.id,
          title: milestone.title,
          type: 'milestone' as const,
          parentId: publicRoadmap.id
        };
        
        items.push(milestoneItem);
        
        // Add tasks for this milestone
        milestone.tasks?.forEach((task: any) => {
          const taskItem: TaskItem = {
            id: task.id,
            title: task.title,
            type: 'task' as const,
            parentId: milestone.id
          };
          items.push(taskItem);
        });
      });
    }
    
    return items;
  }, [publicRoadmap]);
  
  // Update selected roadmap when public roadmap data changes
  useEffect(() => {
    console.log('Public roadmap changed:', publicRoadmap);
    console.log('Current selected items:', selectedItems);
    
    if (publicRoadmap && !selectedItems.roadmap) {
      console.log('Setting initial selected items with public roadmap');
      setSelectedItems(prev => ({
        ...prev,
        roadmap: {
          id: publicRoadmap.id,
          title: publicRoadmap.final_goal || 'My Roadmap',
          type: 'roadmap' as const
        },
        milestone: publicRoadmap.milestones?.[0] ? {
          id: publicRoadmap.milestones[0].id,
          title: publicRoadmap.milestones[0].title,
          type: 'milestone' as const,
          parentId: publicRoadmap.id
        } : null
      }));
    }
  }, [publicRoadmap]);
  
  // Cleanup media stream on unmount
  useEffect((): (() => void) => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      
      // Clean up object URLs to prevent memory leaks
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [mediaStream, preview]);
  // File change is handled in the respective components (ImagePost, VideoPost)
  const handleItemSelect = useCallback((item: UserItem) => {
    setSelectedItems(prev => {
      const newState = { ...prev };
      if (item.type === 'roadmap') {
        newState.roadmap = prev.roadmap?.id === item.id ? null : item;
        // Reset milestone and task when roadmap changes
        if (newState.roadmap?.id !== prev.roadmap?.id) {
          newState.milestone = null;
          newState.task = null;
        }
      } else if (item.type === 'milestone') {
        newState.milestone = prev.milestone?.id === item.id ? null : item;
        // Reset task when milestone changes
        if (newState.milestone?.id !== prev.milestone?.id) {
          newState.task = null;
        }
      } else if (item.type === 'task') {
        newState.task = prev.task?.id === item.id ? null : item;
      }
      return newState;
    });
  }, []);

  // File change is handled in the respective components (ImagePost, VideoPost)

  const startRecording = async () => {
    try {
      // Stop any existing tracks first
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      
      // Start with basic constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          // Start with just the aspect ratio constraint
          aspectRatio: 9/16,
          // Add width/height with fallbacks
          width: { 
            min: 640,
            ideal: 1080,
            max: 1920
          },
          height: {
            min: 1138, // 640 * (16/9)
            ideal: 1920,
            max: 2560 // 1440 * (16/9)
          }
        },
        audio: true
      };
      
      // First try with the ideal constraints
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn('Could not get ideal constraints, trying with minimum...');
        // If that fails, try with minimum constraints
        constraints.video = {
          facingMode: 'environment',
          aspectRatio: { ideal: 9/16 } // Make aspect ratio non-mandatory
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }
      
      // Try to apply better constraints after getting the stream
      try {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = videoTrack.getCapabilities();
          const settings = videoTrack.getSettings();
          
          // Try to get as close as possible to 9:16
          await videoTrack.applyConstraints({
            width: { ideal: Math.min(settings.width || 1080, 1080) },
            height: { ideal: Math.min(settings.height || 1920, 1920) },
            aspectRatio: { ideal: 9/16 }
          });
        }
      } catch (constraintErr) {
        console.warn('Could not apply all video constraints:', constraintErr);
        // Continue with the stream even if constraints couldn't be applied
      }
      
      setMediaStream(stream);
      
      // Ensure the video element is ready
      if (videoRef.current) {
        // Clear any existing source
        videoRef.current.srcObject = null;
        
        // Set the new stream
        videoRef.current.srcObject = stream;
        
        // Set video styles for proper display
        videoRef.current.style.width = '100%';
        videoRef.current.style.height = '100%';
        videoRef.current.style.objectFit = 'cover';
        videoRef.current.style.transform = 'scaleX(-1)';
        videoRef.current.playsInline = true;
        
        // Force play the video
        videoRef.current.play().catch(err => {
          console.error('Error playing video:', err);
          // If autoplay fails, try again with user gesture
          const playPromise = videoRef.current?.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              // Autoplay was prevented, show a play button
              videoRef.current?.setAttribute('controls', '');
            });
          }
        });
        
        // Ensure the video is visible
        videoRef.current.style.display = 'block';
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
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const videoUrl = URL.createObjectURL(blob);
          setPreview(videoUrl);
          
          // Create a File object from the blob
          const fileName = `video-${Date.now()}.webm`;
          const videoFile = new File([blob], fileName, { 
            type: 'video/webm',
            lastModified: Date.now()
          });
          
          // Update the mediaFile state with the recorded video
          setMediaFile(videoFile);
        }
        
        // Clean up the video element
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.srcObject = null;
        }
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setIsRecording(false);
      
      // Clean up on error
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // Request the final video data
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
      
      // Stop all tracks
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }
      
      // Clear the video element
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      
      setIsRecording(false);
    }
  };

  const hasRequiredSelections = useCallback(() => {
    // Require both roadmap and milestone to be selected
    return !!selectedItems.roadmap && !!selectedItems.milestone;
  }, [selectedItems]);

  const getCategory = useCallback((): 'roadmap' | 'milestone' | 'task' => {
    // Return the most specific selected item type
    if (selectedItems.task) return 'task';
    if (selectedItems.milestone) return 'milestone';
    return 'roadmap';
  }, [selectedItems]);

  const handleSubmit = useCallback(async () => {
    if (!type) return;
    
    try {
      setIsUploading(true);
      
      // Upload media file if present
      let mediaUrl: { url: string; path: string; type: 'image' | 'video' | 'voice' } | null = null;
      if (type !== 'text' && mediaFile) {
        try {
          // For voice posts, we need to explicitly set the type to 'voice'
          const uploadType = type === 'voice' ? 'voice' : type;
          mediaUrl = await uploadPostMedia(mediaFile, uploadType);
        } catch (error) {
          console.error('Error uploading media:', error);
          toast.error('Failed to upload media. Please try again.');
          return;
        }
      }
      
      const postData = {
        content: type === 'text' ? text : `Shared ${type} post`,
        mediaFiles: mediaFile ? [mediaFile] : [],
        mediaType: type !== 'text' ? type : undefined,
        mediaUrl: mediaUrl?.url, // Add the uploaded media URL
        roadmapId: selectedItems.roadmap?.id,
        milestoneId: selectedItems.milestone?.id,
        taskId: selectedItems.task?.id,
      };
      
      await createPost(postData);
      
      // Reset form and close modal
      setType(null);
      setText('');
      setPreview(null);
      setMediaFile(null);
      
      // Clean up media resources
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      chunksRef.current = [];
      
      onClose();
      toast.success('Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [type, text, mediaFile, selectedItems, createPost, onClose, mediaStream]);

  const handleTypeSelect = (selectedType: PostType) => {
    // Stop any ongoing recording when switching types
    if (selectedType !== 'voice' && mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    
    setType(selectedType);
    setText('');
    setPreview(null);
    setMediaFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'image') {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setMediaFile(file);
      setPreview(URL.createObjectURL(file));
    } else if (type === 'video') {
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a video file');
        return;
      }
      setMediaFile(file);
      const videoUrl = URL.createObjectURL(file);
      setPreview(videoUrl);
    } else if (type === 'voice') {
      if (!file.type.startsWith('audio/')) {
        toast.error('Please select an audio file');
        return;
      }
      setMediaFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const renderPostForm = () => {
    if (!type || !currentUser) return null;
    
    const userDisplayName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
    const userAvatar = currentUser.user_metadata?.avatar_url || '';
    
    const currentDate = new Date().toISOString();
    
    switch (type) {
      case 'text':
        return (
          <TextPost
            text={text}
            onChange={setText}
            isMaxLength={text.length >= 500}
            category={getCategory()}
            user={{
              name: userDisplayName,
              avatarUrl: userAvatar,
              username: currentUser.email?.split('@')[0] || 'user'
            }}
            timestamp={currentDate}
            currentRoadmap={{
              id: selectedItems.roadmap?.id || '',
              title: selectedItems.roadmap?.title || 'No Roadmap Selected'
            }}
            currentMilestone={{
              id: selectedItems.milestone?.id || '',
              title: selectedItems.milestone?.title || 'No Milestone Selected'
            }}
            currentTask={{
              id: selectedItems.task?.id || '',
              title: selectedItems.task?.title || 'No Task Selected'
            }}
          />
        );
      case 'image':
        return (
          <ImagePost 
            preview={preview}
            onFileChange={handleFileChange}
            category={getCategory()}
          />
        );
      case 'video':
        return (
          <VideoPost
            preview={preview}
            isRecording={isRecording}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onFileChange={handleFileChange}
            videoRef={videoRef}
            category={getCategory()}
          />
        );
      case 'voice':
        return (
          <VoicePost
            onRecordingComplete={(file) => {
              setMediaFile(file);
              setPreview(URL.createObjectURL(file));
            }}
            onCancel={() => setType(null)}
            maxDuration={30}
          />
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 p-8 bg-background rounded-lg shadow-lg">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-foreground">Loading roadmap data...</p>
        </div>
      </div>
    );
  }

  // Show loading state when creating post
  if (isCreating) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="bg-background p-8 rounded-lg max-w-md w-full">
          <p className="text-center">Creating your post...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/100">
      <div className="relative w-full h-full max-w-md">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-3 top-5 z-[100] p-2.5 rounded-full hover:bg-muted/80 text-foreground/80 hover:text-foreground transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>
        
        <div className="h-full flex flex-col p-4">
          <div className="relative w-full">
            {type === null ? (
              <h2 className="text-2xl font-bold mb-8 text-foreground text-center dark:text-foreground">
                Create New Post
              </h2>
            ) : (
              <button 
                onClick={() => {
                  resetForm();
                  setType(null);
                }}
                className="absolute left-2 top-2 z-[1000] p-2.5 rounded-full hover:bg-muted/80 text-foreground/80 hover:text-foreground transition-colors"
                aria-label="Go back"
              >  
                <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
              </button>
            )}
          </div>
          
          {type === null ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="flex justify-center gap-4 w-full">
                  <Button
                    variant={type === 'text' ? 'default' : 'outline'}
                    onClick={() => handleTypeSelect('text')}
                    className="gap-2 flex-1"
                    disabled={!hasRequiredSelections()}
                    title={!selectedItems.roadmap ? 'Please select a roadmap' : !selectedItems.milestone ? 'Please select a milestone' : ''}
                  >
                    <Type className="h-4 w-4" />
                    Text
                  </Button>
                  <Button
                    variant={type === 'image' ? 'default' : 'outline'}
                    onClick={() => handleTypeSelect('image')}
                    className="gap-2 flex-1"
                    disabled={!hasRequiredSelections()}
                    title={!selectedItems.roadmap ? 'Please select a roadmap' : !selectedItems.milestone ? 'Please select a milestone' : ''}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Image
                  </Button>
                  <Button
                    variant={type === 'video' ? 'default' : 'outline'}
                    onClick={() => handleTypeSelect('video')}
                    className="gap-2 flex-1"
                    disabled={!hasRequiredSelections()}
                    title={!selectedItems.roadmap ? 'Please select a roadmap' : !selectedItems.milestone ? 'Please select a milestone' : ''}
                  >
                    <Video className="h-4 w-4" />
                    Video
                  </Button>
                  <Button
                    variant={type === 'voice' ? 'default' : 'outline'}
                    onClick={() => handleTypeSelect('voice')}
                    className="gap-2 flex-1"
                    disabled={!hasRequiredSelections()}
                    title={!selectedItems.roadmap ? 'Please select a roadmap' : !selectedItems.milestone ? 'Please select a milestone' : ''}
                  >
                    <Mic className="h-4 w-4" />
                    Voice
                  </Button>
                </div>
              </div>
              <div className="relative w-full space-y-1" ref={dropdownRef}>
                <span className="text-sm font-medium text-foreground/90 dark:text-foreground/80">
                  Select Roadmap and Milestone <span className="text-red-500">*</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium ${
                    !hasRequiredSelections() ? 'text-muted-foreground/70' : 'text-foreground/90'
                  } bg-background border ${
                    !hasRequiredSelections() ? 'border-red-300' : 'border-input'
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
                  <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg dark:shadow-gray-800/20">
                    <div className="max-h-60 overflow-y-auto py-1">
                      {userItems.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-muted-foreground">
                          You don't have any public roadmap yet
                        </div>
                      ) : (
                        ['roadmap', 'milestone', 'task'].map((itemType) => {
                          const items = userItems.filter(item => item.type === itemType);
                          if (items.length === 0) return null;
                          
                          return (
                            <div key={itemType}>
                              <div className="sticky top-0 z-10 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 dark:bg-muted/30">
                                {itemType}s
                              </div>
                              {items.map((item) => {
                                const isSelected = selectedItems[itemType as keyof typeof selectedItems]?.id === item.id;
                                return (
                                  <label
                                    key={item.id}
                                    className={`flex items-center px-4 py-2 text-sm cursor-pointer ${
                                      isSelected 
                                        ? 'bg-primary/10 text-foreground' 
                                        : 'text-foreground hover:bg-muted/50 dark:hover:bg-muted/70'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 text-primary border-muted-foreground/30 rounded focus:ring-primary"
                                      checked={isSelected}
                                      onChange={() => handleItemSelect(item)}
                                    />
                                    <span className="ml-3">
                                      {item.type === 'roadmap' && '\u{1F5FA} '}
                                      {item.type === 'milestone' && '\u{1F3AF} '}
                                      {item.type === 'task' && '\u2705 '}
                                      {item.title}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {renderPostForm()}
              
              <div className="flex justify-end gap-2 p-4 mt-auto">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  variant="default"
                  onClick={handleSubmit}
                  disabled={!hasRequiredSelections() || (type === 'text' && !text.trim())}
                  className="px-4"
                >
                  Post
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
