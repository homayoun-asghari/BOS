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
