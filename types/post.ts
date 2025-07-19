export interface Post {
  id: string;
  user_id: string;
  content: string;
  media_urls: Array<{
    url: string;
    path: string;
    type: string;
  }> | string[] | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    username: string | null;
    avatar_url: string | null;
  };
}

export interface Note {
  id: string;
  title: string;
  content: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface Roadmap {
  id: string;
  title: string;
  description: string | null;
  final_goal: string;
  start_date: string | null;
  end_date: string | null;
  cover_image_url?: string | null;
  milestones: Milestone[];
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  order_index: number;
  tasks: Task[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'completed';
  priority: 'low' | 'medium' | 'high';
  order_index: number;
}
