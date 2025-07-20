export interface PostDisplayProps {
  id: string;
  user: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  timestamp: string | Date;
  currentRoadmap: {
    id: string;
    title: string;
  } | null;
  currentMilestone: {
    id: string;
    title: string;
  } | null;
  currentTask: {
    id: string;
    title: string;
  } | null;
  likes: number;
  isLiked?: boolean;
  onLike?: () => Promise<void>;
  onUnlike?: () => Promise<void>;
  className?: string;
}
