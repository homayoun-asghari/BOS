export const dummyPosts = [
  {
    id: '1',
    type: 'text',
    content: 'Working on the new feature for our project. Excited about the progress!',
    timestamp: new Date('2025-07-15T07:00:00+03:00'),
    user: {
      name: 'John Doe',
      avatarUrl: 'https://randomuser.me/api/portraits/men/1.jpg'
    },
    category: 'task',
    currentRoadmap: {
      id: '1',
      title: 'Q3 2025 Roadmap'
    },
    currentMilestone: {
      id: '2',
      title: 'Feature Development'
    },
    currentTask: {
      id: '3',
      title: 'Implement New Feature'
    },
    likes: 15
  },
  {
    id: '2',
    type: 'image',
    imageUrl: 'https://picsum.photos/800/1200?random=1',
    timestamp: new Date('2025-07-15T06:30:00+03:00'),
    user: {
      name: 'Jane Smith',
      avatarUrl: 'https://randomuser.me/api/portraits/women/1.jpg'
    },
    category: 'roadmap',
    currentRoadmap: {
      id: '1',
      title: 'Q3 2025 Roadmap'
    },
    currentMilestone: {
      id: '1',
      title: 'Planning Phase'
    },
    currentTask: {
      id: '4',
      title: 'Define Requirements'
    },
    likes: 22
  },
  {
    id: '3',
    type: 'video',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    timestamp: new Date('2025-07-15T06:00:00+03:00'),
    user: {
      name: 'Mike Johnson',
      avatarUrl: 'https://randomuser.me/api/portraits/men/2.jpg'
    },
    category: 'milestone',
    currentRoadmap: {
      id: '1',
      title: 'Q3 2025 Roadmap'
    },
    currentMilestone: {
      id: '3',
      title: 'Implementation Phase'
    },
    currentTask: {
      id: '5',
      title: 'Code Review'
    },
    likes: 18
  }
];
