export interface Post {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string;
  imageUrl: string;
  videoUrl: string;
  category: string;
  timestamp: Date;
  likes: number;
  onLike: () => void;
  user: {
    name: string;
    username: string;
    avatarUrl: string;
  };
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
}
