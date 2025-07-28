export interface PostDisplayProps {
  id: string;
  user: {
    name?: string;
    username: string;
    avatarUrl?: string;
    display_name?: string;
  };
  timestamp: string | Date;
  currentRoadmap?: {
    id: string;
    title: string;
  };
  currentMilestone?: {
    id: string;
    title: string;
  };
  currentTask?: {
    id: string;
    title: string;
  };
  likes: number;
  isLiked?: boolean;
  onLike?: () => Promise<void>;
  onUnlike?: () => Promise<void>;
  className?: string;
  content: string;
}
