export interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
  tags: string[];
}

interface MockUser {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
  location: string;
  website: string;
  stats: {
    totalLikes: number;
    totalPosts: number;
    totalMilestones: number;
    completedMilestones: number;
    followers: number;
    following: number;
  };
  history: Array<{
    type: string;
    date: string;
    description: string;
  }>;
  currentRoadmap: {
    id: string;
    title: string;
    description: string;
    milestones: Array<{
      id: string;
      title: string;
      tasks: Array<{
        id: string;
        title: string;
        status: 'todo' | 'in_progress' | 'completed';
      }>;
    }>;
  };
  posts: Array<{
    id: string;
    type: 'text' | 'image' | 'video';
    content: string;
    imageUrl?: string;
    videoUrl?: string;
    timestamp: string;
    likes: number;
  }>;
  notes: Note[];
}

export const mockUserData: MockUser[] = [
  {
    id: 'user123',
    username: 'johndoe',
    name: 'John Doe',
    avatarUrl: 'https://avatars.githubusercontent.com/u/12345678?v=4',
    bio: 'Software engineer and tech enthusiast',
    location: 'San Francisco, CA',
    website: 'https://homayoun.dev',
    stats: {
      totalLikes: 1250,
      totalPosts: 85,
      totalMilestones: 15,
      completedMilestones: 10,
      followers: 543,
      following: 321
    },
    history: [
      {
        type: 'joined',
        date: '2023-01-15',
        description: 'Joined the platform'
      },
      {
        type: 'milestone',
        date: '2023-03-10',
        description: 'Completed first milestone: Learn React'
      },
      {
        type: 'post',
        date: '2023-04-25',
        description: 'Published first post: Getting started with React'
      }
    ],
    currentRoadmap: {
      id: 'roadmap1',
      title: 'Full Stack Development Journey',
      description: 'Learning full stack development with React and Node.js',
      milestones: [
        {
          id: 'milestone1',
          title: 'Frontend Fundamentals',
          tasks: [
            {
              id: 'task1',
              title: 'Learn React Basics',
              status: 'completed'
            },
            {
              id: 'task2',
              title: 'Build a Portfolio Website',
              status: 'in_progress'
            }
          ]
        }
      ]
    },
    notes: [
      {
        id: 'note1',
        title: 'React Best Practices',
        content: 'Use functional components with hooks for better code organization and performance. Follow the single responsibility principle and keep components small and focused.',
        date: '2023-04-20',
        tags: ['react', 'best-practices', 'development']
      },
      {
        id: 'note2',
        title: 'Node.js Performance Tips',
        content: 'Use async/await for better readability. Implement proper error handling with try/catch. Use process.env for environment variables.',
        date: '2023-04-25',
        tags: ['nodejs', 'performance', 'optimization']
      }
    ],
    posts: [
      {
        id: 'post1',
        type: 'text' as const,
        content: 'Just finished my first React project! #learning #reactjs',
        timestamp: '2023-04-25T14:30:00Z',
        likes: 45
      },
      {
        id: 'post2',
        type: 'image' as const,
        content: 'Beautiful sunset at the beach',
        imageUrl: 'https://picsum.photos/800/600',
        timestamp: '2023-04-26T10:15:00Z',
        likes: 78
      },
      {
        id: 'post3',
        type: 'video' as const,
        content: 'My latest coding tutorial',
        videoUrl: 'https://player.vimeo.com/video/123456789',
        timestamp: '2023-04-27T16:45:00Z',
        likes: 123
      }
    ]
  },
  {
    id: 'user456',
    username: 'janedoe',
    name: 'Jane Doe',
    avatarUrl: 'https://avatars.githubusercontent.com/u/98765432?v=4',
    bio: 'Full-stack developer with a passion for building scalable applications',
    location: 'New York, NY',
    website: 'https://janedoe.dev',
    stats: {
      totalLikes: 890,
      totalPosts: 60,
      totalMilestones: 10,
      completedMilestones: 7,
      followers: 325,
      following: 210
    },
    history: [
      {
        type: 'joined',
        date: '2023-01-15',
        description: 'Joined the platform'
      },
      {
        type: 'milestone',
        date: '2023-03-10',
        description: 'Completed first milestone: Learn React'
      },
      {
        type: 'post',
        date: '2023-04-25',
        description: 'Published first post: Getting started with React'
      }
    ],
    currentRoadmap: {
      id: 'roadmap2',
      title: 'Full Stack Development Journey',
      description: 'Learning full stack development with React and Node.js',
      milestones: [
        {
          id: 'milestone2',
          title: 'Backend Fundamentals',
          tasks: [
            {
              id: 'task3',
              title: 'Learn Node.js Basics',
              status: 'completed'
            },
            {
              id: 'task4',
              title: 'Build a REST API',
              status: 'in_progress'
            }
          ]
        }
      ]
    },
    notes: [
      {
        id: 'note1',
        title: 'React Best Practices',
        content: 'Use functional components with hooks for better code organization and performance. Follow the single responsibility principle and keep components small and focused.',
        date: '2023-04-20',
        tags: ['react', 'best-practices', 'development']
      },
      {
        id: 'note2',
        title: 'Node.js Performance Tips',
        content: 'Use async/await for better readability. Implement proper error handling with try/catch. Use process.env for environment variables.',
        date: '2023-04-25',
        tags: ['nodejs', 'performance', 'optimization']
      }
    ],
    posts: [
      {
        id: 'post4',
        type: 'text' as const,
        content: 'Just finished my first Node.js project! #learning #nodejs',
        timestamp: '2023-04-25T14:30:00Z',
        likes: 45
      },
      {
        id: 'post5',
        type: 'image' as const,
        content: 'Check out this amazing image!',
        imageUrl: 'https://picsum.photos/800/600',
        timestamp: '2023-04-26T10:15:00Z',
        likes: 78
      }
    ]
  },
  {
    id: 'user789',
    username: 'janesmith',
    name: 'Jane Smith',
    avatarUrl: 'https://avatars.githubusercontent.com/u/12345678?v=4',
    bio: 'Frontend developer with a passion for UI/UX',
    location: 'San Francisco, CA',
    website: 'https://janesmith.dev',
    stats: {
      totalLikes: 1250,
      totalPosts: 85,
      totalMilestones: 15,
      completedMilestones: 10,
      followers: 543,
      following: 321
    },
    history: [
      {
        type: 'joined',
        date: '2023-01-15',
        description: 'Joined the platform'
      },
      {
        type: 'milestone',
        date: '2023-03-10',
        description: 'Completed first milestone: Learn React'
      },
      {
        type: 'post',
        date: '2023-04-25',
        description: 'Published first post: Getting started with React'
      }
    ],
    currentRoadmap: {
      id: 'roadmap3',
      title: 'Frontend Development Journey',
      description: 'Learning frontend development with React and TypeScript',
      milestones: [
        {
          id: 'milestone3',
          title: 'React Fundamentals',
          tasks: [
            {
              id: 'task5',
              title: 'Learn React Basics',
              status: 'completed'
            },
            {
              id: 'task6',
              title: 'Build a Portfolio Website',
              status: 'in_progress'
            }
          ]
        }
      ]
    },
    notes: [
      {
        id: 'note1',
        title: 'React Best Practices',
        content: 'Use functional components with hooks for better code organization and performance. Follow the single responsibility principle and keep components small and focused.',
        date: '2023-04-20',
        tags: ['react', 'best-practices', 'development']
      },
      {
        id: 'note2',
        title: 'Node.js Performance Tips',
        content: 'Use async/await for better readability. Implement proper error handling with try/catch. Use process.env for environment variables.',
        date: '2023-04-25',
        tags: ['nodejs', 'performance', 'optimization']
      }
    ],
    posts: [
      {
        id: 'post6',
        type: 'text' as const,
        content: 'Just finished my first React project! #learning #reactjs',
        timestamp: '2023-04-25T14:30:00Z',
        likes: 45
      },
      {
        id: 'post7',
        type: 'image' as const,
        content: 'Beautiful sunset at the beach',
        imageUrl: 'https://picsum.photos/800/600',
        timestamp: '2023-04-26T10:15:00Z',
        likes: 78
      },
      {
        id: 'post8',
        type: 'video' as const,
        content: 'My latest coding tutorial',
        videoUrl: 'https://player.vimeo.com/video/123456789',
        timestamp: '2023-04-27T16:45:00Z',
        likes: 123
      }
    ]
  },
  {
    id: 'user789',
    username: 'janedoe',
    name: 'Jane Doe',
    avatarUrl: 'https://avatars.githubusercontent.com/u/98765432?v=4',
    bio: 'Full-stack developer with a passion for building scalable applications',
    location: 'New York, NY',
    website: 'https://janedoe.dev',
    stats: {
      totalLikes: 890,
      totalPosts: 60,
      totalMilestones: 10,
      completedMilestones: 7,
      followers: 325,
      following: 210
    },
    history: [
      {
        type: 'joined',
        date: '2023-02-20',
        description: 'Joined the platform'
      },
      {
        type: 'milestone',
        date: '2023-04-05',
        description: 'Completed Node.js backend course'
      },
      {
        type: 'post',
        date: '2023-04-30',
        description: 'Published Node.js API tutorial'
      }
    ],
    currentRoadmap: {
      id: 'roadmap2',
      title: 'Backend Development',
      description: 'Mastering backend development with Node.js and MongoDB',
      milestones: [
        {
          id: 'milestone2',
          title: 'Backend Architecture',
          tasks: [
            {
              id: 'task3',
              title: 'Learn RESTful API design',
              status: 'completed'
            },
            {
              id: 'task4',
              title: 'Build authentication system',
              status: 'in_progress'
            }
          ]
        }
      ]
    },
    notes: [
      {
        id: 'note1',
        title: 'React Best Practices',
        content: 'Use functional components with hooks for better code organization and performance. Follow the single responsibility principle and keep components small and focused.',
        date: '2023-04-20',
        tags: ['react', 'best-practices', 'development']
      },
      {
        id: 'note2',
        title: 'Node.js Performance Tips',
        content: 'Use async/await for better readability. Implement proper error handling with try/catch. Use process.env for environment variables.',
        date: '2023-04-25',
        tags: ['nodejs', 'performance', 'optimization']
      }
    ],
    posts: [
      {
        id: 'post4',
        type: 'text' as const,
        content: 'Just built a real-time chat app with Socket.io! #nodejs #websockets',
        timestamp: '2023-04-30T09:45:00Z',
        likes: 35
      },
      {
        id: 'post5',
        type: 'image' as const,
        content: 'Check out this amazing image!',
        imageUrl: 'https://picsum.photos/800/600?random=1',
        timestamp: '2023-04-29T15:30:00Z',
        likes: 56
      }
    ]
  }
];
