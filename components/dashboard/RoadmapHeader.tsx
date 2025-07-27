import { useState } from 'react';
import { MoreVertical, Pencil, Trash2, Clock, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface RoadmapHeaderProps {
  roadmap: {
    id: string;
    final_goal: string;
    start_date?: string;
    end_date?: string;
    status?: 'draft' | 'in_progress' | 'completed' | 'archived';
    updated_at?: string;
    cover_image_url?: string | null;
    is_public?: boolean;
    milestones?: Array<{
      status?: string;
      tasks?: Array<{
        status: string;
      }>;
    }>;
  };
  progress: number;
  totalTasks: number;
  completedTasks: number;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  isCompleting?: boolean;
  isEditable?: boolean;
  showCompletionPrompt?: boolean;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => Promise<void>;
  onDeleteCancel: () => void;
  onCompleteConfirm: () => Promise<boolean>;
  onCompletionDismiss: () => void;
  showActions?: boolean;
}

export function RoadmapHeader({
  roadmap,
  progress,
  totalTasks,
  completedTasks,
  isDeleteDialogOpen,
  isDeleting,
  onEditClick,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
  showActions = true,
  isEditable = true,
  onCompleteConfirm,
  showCompletionPrompt = false,
  onCompletionDismiss,
}: RoadmapHeaderProps) {
  console.log('RoadmapHeader - roadmap:', roadmap);
  console.log('RoadmapHeader - cover_image_url:', roadmap.cover_image_url);
  // Get the full image URL from the cover_image_url
  const getFullImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    // If it's already a full URL, return as is
    if (url.startsWith('http')) return url;
    
    // Otherwise, construct the full URL using the Supabase public URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('NEXT_PUBLIC_SUPABASE_URL is not defined');
      return null;
    }
    
    // Remove any leading slashes from the path
    const cleanPath = url.replace(/^\//, '');
    const bucket = 'roadmap-covers';
    const fullUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
    
    console.log('Generated image URL:', fullUrl);
    return fullUrl;
  };
  
  const fullImageUrl = getFullImageUrl(roadmap.cover_image_url);
  const hasCoverImage = !!fullImageUrl;
  const isCompleted = roadmap.status === 'completed';
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Calculate days remaining or completed
  const getDateBadge = () => {
    const isCompleted = roadmap.status === 'completed';
    
    if (isCompleted && roadmap.updated_at) {
      return {
        text: `Completed on ${formatDate(roadmap.updated_at)}`,
        icon: <Check className="h-4 w-4 mr-1" />,
        variant: 'default' as const
      };
    }
    
    // Show completion prompt in badge when all milestones are done but not confirmed
    if (showCompletionPrompt) {
      return {
        text: 'All milestones are unlocked, is this roadmap completed?',
        icon: <Check className="h-4 w-4 mr-1" />,
        variant: 'destructive' as const,
        action: {
          text: 'Confirm',
          onClick: async () => {
            setIsCompleting(true);
            try {
              await onCompleteConfirm();
            } finally {
              setIsCompleting(false);
            }
          }
        }
      };
    }
    
    if (roadmap.end_date) {
      const endDate = new Date(roadmap.end_date);
      const today = new Date();
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return {
          text: `${Math.abs(diffDays)} days overdue`,
          icon: <Clock className="h-4 w-4 mr-1" />,
          variant: 'destructive' as const
        };
      } else if (diffDays === 0) {
        return {
          text: 'Due today',
          icon: <Clock className="h-4 w-4 mr-1" />,
          variant: 'destructive' as const
        };
      } else if (diffDays <= 7) {
        return {
          text: `${diffDays} ${diffDays === 1 ? 'day' : 'days'} left`,
          icon: <Clock className="h-4 w-4 mr-1" />,
          variant: 'warning' as const
        };
      } else {
        return {
          text: `Due ${formatDate(roadmap.end_date)}`,
          icon: <Clock className="h-4 w-4 mr-1" />,
          variant: 'default' as const
        };
      }
    }
    
    return null;
  };
  
  const dateBadge = getDateBadge();
  
  return (
    <div className="sticky top-0 z-10 flex flex-col rounded-lg overflow-hidden h-[222px] bg-background/80">
      <div className="relative h-full p-4">
        
        {/* Cover Image */}
      {hasCoverImage && fullImageUrl && (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <img 
            src={fullImageUrl}
            alt="Roadmap cover"
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Failed to load cover image:', fullImageUrl);
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
            onLoad={() => console.log('Cover image loaded successfully:', fullImageUrl)}
          />
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
        </div>
      )}
      <div className="flex flex-col w-full h-full relative z-10">
        {/* Top Section: Final Goal and Dates */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <h2 className={cn(
                "text-2xl font-bold tracking-tight",
                hasCoverImage ? "text-white" : "text-foreground"
              )}>
                {roadmap.final_goal}
              </h2>
              {typeof roadmap.is_public !== 'undefined' && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                )}>
                  {roadmap.is_public ? 'Public' : 'Private'}
                </span>
              )}
            </div>
            {(showActions && isEditable) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className={cn(
                      "h-8 w-8 p-0",
                      hasCoverImage ? "text-white hover:bg-white/20" : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem 
                    onClick={onEditClick}
                    className="cursor-pointer"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={onDeleteClick}
                    className="cursor-pointer"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
                    {roadmap.start_date && roadmap.end_date && (
            <div className="flex items-center gap-2 mb-4">
              <p className={cn(
                "text-sm",
                hasCoverImage ? "text-gray-200" : "text-muted-foreground"
              )}>
                {new Date(roadmap.start_date).toLocaleDateString()} -{' '}
                {new Date(roadmap.end_date).toLocaleDateString()}
              </p>
              {(() => {
                // Check if roadmap is marked as completed
                if (roadmap.status === 'completed' && roadmap.updated_at) {
                  return (
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-md flex items-center gap-1",
                      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                    )}>
                      Completed on {new Date(roadmap.updated_at).toLocaleDateString()}
                    </span>
                  );
                }

                // Check if all milestones are completed (fallback)
                const allMilestonesCompleted = roadmap.milestones?.every(
                  milestone => milestone.status === 'completed' || milestone.tasks?.every(task => task.status === 'done')
                );

                // Only show the Done button when showCompletionPrompt is true
                if (allMilestonesCompleted && showCompletionPrompt) {
                  return (
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-red-500 blur-[3px] animate-pulse opacity-90 scale-105 -z-10" style={{
                        animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }}></div>
                      <button
                        onClick={onCompleteConfirm}
                        className="relative text-xs px-2 py-0.5 rounded-full bg-foreground text-background hover:bg-primary hover:scale-105 transition-all duration-200 transform-gpu border-2 border-red-500/60"
                      >
                        <span className="relative z-10">Done!</span>
                      </button>
                    </div>
                  );
                }

                // Otherwise, show countdown
                const endDate = new Date(roadmap.end_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);
                
                // Calculate difference in days
                const diffTime = endDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays > 0) {
                  return (
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-md flex items-center gap-1",
                      hasCoverImage 
                        ? "bg-white/10 text-white/80" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      <Clock className="h-3 w-3" />
                      {diffDays} {diffDays === 1 ? 'day' : 'days'} left
                    </span>
                  );
                } else if (diffDays === 0) {
                  return (
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-md flex items-center gap-1",
                      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                    )}>
                      <Clock className="h-3 w-3" />
                      Last day!
                    </span>
                  );
                } else {
                  return (
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-md flex items-center gap-1",
                      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    )}>
                      <Clock className="h-3 w-3" />
                      Ended {Math.abs(diffDays)} {Math.abs(diffDays) === 1 ? 'day' : 'days'} ago
                    </span>
                  );
                }
              })()}
            </div>
          )}
        </div>

        {/* Bottom Section: Progress Bar - Pushed to bottom */}
        <div className="mt-auto pt-4">
          <div className="flex justify-between text-sm">
            <span className={cn("font-medium", hasCoverImage ? "text-gray-200" : "text-foreground")}>
              {completedTasks} of {totalTasks} milestones completed
            </span>
            <span className={hasCoverImage ? "text-gray-200" : "text-muted-foreground"}>
              {progress}%
            </span>
          </div>
          <div className={cn(
            "h-2 w-full overflow-hidden rounded-full",
            hasCoverImage ? "bg-white/20" : "bg-secondary"
          )}>
            <div
              className={cn(
                "h-full transition-all duration-300",
                hasCoverImage ? "bg-white" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showActions && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={onDeleteCancel}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Roadmap</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm text-destructive font-medium">
                <span className="font-bold">Warning:</span> All posts related to this roadmap will also be permanently deleted. Are you sure you want to delete this roadmap?
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onDeleteCancel} disabled={isDeleting}>
                Cancel
              </Button>
              <Button 
                variant="outline" 
                onClick={onDeleteConfirm} 
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </div>
  );
}
