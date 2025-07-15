import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PostCardProps {
  id: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
  content: string;
  timestamp: string | Date;
  currentRoadmap: {
    id: string;
    title: string;
  };
  currentMilestone: {
    id: string;
    title: string;
  };
  currentTask: {
    id: string;
    title: string;
  };
  likes: number;
  onLike?: (postId: string) => void;
  className?: string;
}

export function PostCard({
  id,
  user,
  content,
  timestamp,
  currentRoadmap,
  currentMilestone,
  currentTask,
  likes,
  onLike,
  className,
}: PostCardProps) {
  const formattedTime = formatDistanceToNow(new Date(timestamp), { addSuffix: true });

  return (
    <div className={cn("bg-card rounded-lg border border-border/50 p-4 space-y-4", className)}>
      {/* User Info */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatarUrl} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{user.name}</p>
          <p className="text-xs text-muted-foreground">{formattedTime}</p>
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Working on:</p>
        <div className="relative">
          <div className="absolute left-6 right-6 top-3 h-0.5 bg-border dark:bg-muted-foreground/30 -z-10 sm:left-8 sm:right-8"></div>
          <ol className="flex w-full justify-between">
            {/* Roadmap */}
            <li className="relative flex-1">
              <div className="flex flex-col items-center px-2">
                <div className="whitespace-nowrap text-center w-full">
                  <div className="z-10 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 shrink-0 mx-auto">
                    <svg className="w-2.5 h-2.5 text-primary dark:text-primary-foreground" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z"/>
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground truncate w-full">{currentRoadmap.title}</h3>
                  <p className="text-xs text-muted-foreground">Roadmap</p>
                </div>
              </div>
            </li>

            {/* Milestone */}
            <li className="relative flex-1">
              <div className="flex flex-col items-center px-2">
                <div className="whitespace-nowrap text-center w-full">
                  <div className="z-10 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 shrink-0 mx-auto">
                    <svg className="w-2.5 h-2.5 text-primary dark:text-primary-foreground" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z"/>
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground truncate w-full">{currentMilestone.title}</h3>
                  <p className="text-xs text-muted-foreground">Milestone</p>
                </div>
              </div>
            </li>

            {/* Task */}
            <li className="relative flex-1">
              <div className="flex flex-col items-center px-2">
                <div className="whitespace-nowrap text-center w-full">
                  <div className="z-10 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 shrink-0 mx-auto">
                    <svg className="w-2.5 h-2.5 text-primary dark:text-primary-foreground" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z"/>
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground truncate w-full">{currentTask.title}</h3>
                  <p className="text-xs text-muted-foreground">Task</p>
                </div>
              </div>
            </li>
          </ol>
        </div>
      </div>

      {/* Post Content */}
      <p className="mt-4 text-sm">{content}</p>

      {/* Actions */}
      <div className="flex items-center pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => onLike?.(id)}
        >
          <ThumbsUp className="h-4 w-4" />
          <span>{likes}</span>
        </Button>
      </div>
    </div>
  );
}
