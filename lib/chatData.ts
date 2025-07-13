// Dummy data for testing chat UI

// User data
export const dummyUsers = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'alice',
    avatar_url: 'https://i.pravatar.cc/150?img=1',
    email: 'alice@example.com'
  },
  {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    username: 'bob',
    avatar_url: 'https://i.pravatar.cc/150?img=2',
    email: 'bob@example.com'
  },
  {
    id: '6ba7b811-9dad-11d1-80b4-00c04fd430c9',
    username: 'charlie',
    avatar_url: 'https://i.pravatar.cc/150?img=3',
    email: 'charlie@example.com'
  },
  {
    id: '6ba7b812-9dad-11d1-80b4-00c04fd430c0',
    username: 'diana',
    avatar_url: 'https://i.pravatar.cc/150?img=4',
    email: 'diana@example.com'
  }
];

// Current user (you)
export const currentUser = {
  id: '00000000-0000-0000-0000-000000000000',
  username: 'you',
  avatar_url: 'https://i.pravatar.cc/150?img=5',
  email: 'you@example.com'
};

// Chat rooms
export const dummyRooms = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    is_group: false,
    name: 'Alice',
    created_at: '2025-07-10T10:00:00Z',
    updated_at: '2025-07-13T08:30:00Z',
    participantIds: ['00000000-0000-0000-0000-000000000000', '550e8400-e29b-41d4-a716-446655440000']
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    is_group: true,
    name: 'Project Team',
    created_at: '2025-07-05T14:20:00Z',
    updated_at: '2025-07-13T09:15:00Z',
    media_urls: ['https://i.pravatar.cc/300?img=6']
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    is_group: false,
    name: 'Bob',
    created_at: '2025-07-12T16:45:00Z',
    updated_at: '2025-07-13T07:22:00Z',
    participantIds: ['00000000-0000-0000-0000-000000000000', '6ba7b810-9dad-11d1-80b4-00c04fd430c8']
  }
];

// Chat participants
export const dummyParticipants = [
  // Direct chat with Alice
  { room_id: dummyRooms[0].id, user_id: currentUser.id, joined_at: '2025-07-10T10:00:00Z' },
  { room_id: dummyRooms[0].id, user_id: dummyUsers[0].id, joined_at: '2025-07-10T10:00:00Z' },
  
  // Group chat (Project Team)
  { room_id: dummyRooms[1].id, user_id: currentUser.id, joined_at: '2025-07-05T14:20:00Z' },
  { room_id: dummyRooms[1].id, user_id: dummyUsers[0].id, joined_at: '2025-07-05T14:20:00Z' },
  { room_id: dummyRooms[1].id, user_id: dummyUsers[1].id, joined_at: '2025-07-05T14:20:00Z' },
  { room_id: dummyRooms[1].id, user_id: dummyUsers[2].id, joined_at: '2025-07-05T14:20:00Z' },
  
  // Direct chat with Bob
  { room_id: dummyRooms[2].id, user_id: currentUser.id, joined_at: '2025-07-12T16:45:00Z' },
  { room_id: dummyRooms[2].id, user_id: dummyUsers[1].id, joined_at: '2025-07-12T16:45:00Z' }
];

// Chat messages
export const dummyMessages = [
  // Messages in Alice's chat
  {
    id: '10000000-0000-0000-0000-000000000001',
    room_id: dummyRooms[0].id,
    sender_id: dummyUsers[0].id,
    content: 'Hey there! How are you doing?',
    created_at: '2025-07-10T10:05:00Z',
    is_read: true
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    room_id: dummyRooms[0].id,
    sender_id: currentUser.id,
    content: "Hi Alice! I'm doing great, thanks for asking. How about you?",
    created_at: '2025-07-10T10:10:00Z',
    is_read: true
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    room_id: dummyRooms[0].id,
    sender_id: dummyUsers[0].id,
    content: "I'm good too! Just working on that project we discussed.",
    created_at: '2025-07-10T10:12:00Z',
    is_read: true
  },
  
  // Messages in Project Team group
  {
    id: '20000000-0000-0000-0000-000000000001',
    room_id: dummyRooms[1].id,
    sender_id: dummyUsers[0].id,
    content: 'Welcome everyone to the project team!',
    created_at: '2025-07-05T14:25:00Z',
    is_read: true
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    room_id: dummyRooms[1].id,
    sender_id: dummyUsers[1].id,
    content: 'Thanks for having me! Looking forward to working with everyone.',
    created_at: '2025-07-05T14:30:00Z',
    is_read: true
  },
  {
    id: '20000000-0000-0000-0000-000000000003',
    room_id: dummyRooms[1].id,
    sender_id: currentUser.id,
    content: 'Same here! When are we having our first meeting?',
    created_at: '2025-07-05T14:35:00Z',
    is_read: true
  },
  {
    id: '20000000-0000-0000-0000-000000000004',
    room_id: dummyRooms[1].id,
    sender_id: dummyUsers[2].id,
    content: 'How about tomorrow at 2 PM?',
    created_at: '2025-07-12T15:30:00Z',
    is_read: true
  },
  {
    id: '20000000-0000-0000-0000-000000000005',
    room_id: dummyRooms[1].id,
    sender_id: dummyUsers[1].id,
    content: 'Works for me!',
    created_at: '2025-07-12T15:35:00Z',
    is_read: true
  },
  {
    id: '20000000-0000-0000-0000-000000000006',
    room_id: dummyRooms[1].id,
    sender_id: dummyUsers[0].id,
    content: 'Perfect, I\'ll send out a calendar invite.',
    created_at: '2025-07-13T09:10:00Z',
    is_read: false
  },
  
  // Messages in Bob's chat
  {
    id: '30000000-0000-0000-0000-000000000001',
    room_id: dummyRooms[2].id,
    sender_id: dummyUsers[1].id,
    content: 'Hey! Do you have a minute to chat about the project?',
    created_at: '2025-07-12T16:50:00Z',
    is_read: true
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    room_id: dummyRooms[2].id,
    sender_id: currentUser.id,
    content: 'Hi Bob! Sure, what would you like to discuss?',
    created_at: '2025-07-12T17:00:00Z',
    is_read: true
  },
  {
    id: '30000000-0000-0000-0000-000000000003',
    room_id: dummyRooms[2].id,
    sender_id: dummyUsers[1].id,
    content: 'I was thinking about the architecture. Do you think we should use GraphQL or REST?',
    created_at: '2025-07-12T17:05:00Z',
    is_read: true
  },
  {
    id: '30000000-0000-0000-0000-000000000004',
    room_id: dummyRooms[2].id,
    sender_id: currentUser.id,
    content: 'I think GraphQL would be better for our use case. More flexible for the frontend.',
    created_at: '2025-07-13T07:15:00Z',
    is_read: false
  },
  {
    id: '30000000-0000-0000-0000-000000000005',
    room_id: dummyRooms[2].id,
    sender_id: dummyUsers[1].id,
    content: 'Agreed! Let me know when you have some time to discuss the schema.',
    created_at: '2025-07-13T07:22:00Z',
    is_read: false
  }
];

// Helper functions
export const getRoomMessages = (roomId: string) => {
  return dummyMessages
    .filter(message => message.room_id === roomId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

export const getRoomParticipants = (roomId: string) => {
  return dummyParticipants
    .filter(participant => participant.room_id === roomId)
    .map(participant => {
      const user = [...dummyUsers, currentUser].find(u => u.id === participant.user_id);
      return user ? { ...participant, user } : null;
    })
    .filter(Boolean);
};

export const getOtherParticipant = (roomId: string, currentUserId: string) => {
  const participant = dummyParticipants.find(
    p => p.room_id === roomId && p.user_id !== currentUserId
  );
  return dummyUsers.find(user => user.id === participant?.user_id);
};

export const getUnreadCount = (roomId: string, currentUserId: string) => {
  return dummyMessages.filter(
    message => 
      message.room_id === roomId && 
      message.sender_id !== currentUserId && 
      !message.is_read
  ).length;
};
