import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
const __dirname = new URL('.', import.meta.url).pathname;
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing required environment variables.');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '***SET***' : 'MISSING');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '***SET***' : 'MISSING');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create a test user
async function createTestUser() {
  const email = `test-${Date.now()}@example.com`;
  const username = `testuser-${Date.now()}`;
  
  console.log('Creating test user:', { email, username });
  
  // Insert user into auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true,
    user_metadata: {
      username,
      full_name: faker.person.fullName(),
      avatar_url: `https://i.pravatar.cc/150?u=${Date.now()}`
    }
  });
  
  if (authError) {
    console.error('Error creating auth user:', authError);
    return null;
  }
  
  const userId = authData.user.id;
  console.log('Created auth user:', userId);
  
  // Check if profile already exists (might have been created by trigger)
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('Error checking for existing profile:', fetchError);
    return null;
  }
  
  if (!existingProfile) {
    // Only create profile if it doesn't exist
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: userId,
        email,
        username,
        display_name: faker.person.fullName(),
        avatar_url: `https://i.pravatar.cc/150?u=${userId}`,
        created_at: new Date().toISOString()
      }]);
      
    if (profileError) {
      console.error('Error creating profile:', profileError);
      return null;
    }
  }
  
  return userId;
}

// Define different roadmap themes with related content
const roadmapThemes = [
  {
    title: 'Web Development Mastery',
    description: 'Become a full-stack web developer with modern technologies',
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'PostgreSQL'],
    milestones: [
      'Frontend Fundamentals',
      'Backend Development',
      'Database Design',
      'Full-Stack Integration',
      'Deployment & DevOps'
    ]
  },
  {
    title: 'Data Science Journey',
    description: 'Master data analysis, visualization, and machine learning',
    skills: ['Python', 'Pandas', 'NumPy', 'Matplotlib', 'Scikit-learn', 'SQL'],
    milestones: [
      'Python for Data Science',
      'Data Analysis Fundamentals',
      'Data Visualization',
      'Machine Learning Basics',
      'Advanced ML Projects'
    ]
  },
  {
    title: 'Mobile App Development',
    description: 'Build cross-platform mobile applications with React Native',
    skills: ['JavaScript', 'React Native', 'Redux', 'Firebase', 'Mobile UI/UX'],
    milestones: [
      'React Native Basics',
      'Navigation & State Management',
      'Working with APIs',
      'Native Features',
      'Publishing & Monetization'
    ]
  }
];

// Create a test roadmap with milestones, tasks, and posts
async function createTestRoadmap(userId: string) {
  // Select a random theme
  const theme = faker.helpers.arrayElement(roadmapThemes);
  
  // Create the roadmap
  const roadmap = {
    user_id: userId,
    title: theme.title,
    description: theme.description,
    final_goal: `Become proficient in ${theme.skills.join(', ')}`,
    is_public: faker.datatype.boolean(0.8), // 80% chance of being public
    status: 'published',
    start_date: new Date().toISOString(),
    end_date: faker.date.soon({ days: 90 }).toISOString(),
    cover_image_url: `https://picsum.photos/800/400?random=${Math.floor(Math.random() * 1000)}`
  };
  
  console.log('Creating test roadmap for user:', userId);
  
  const { data: roadmapData, error: roadmapError } = await supabase
    .from('roadmaps')
    .insert([roadmap])
    .select()
    .single();
    
  if (roadmapError) {
    console.error('Error creating roadmap:', roadmapError);
    return null;
  }
  
  console.log('Created roadmap:', roadmapData.id);
  
  // Create milestones based on theme
  const today = new Date();
  for (const [index, milestoneTitle] of theme.milestones.entries()) {
    // Calculate dates for the milestone
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + index * 7);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7); // Each milestone lasts 7 days
    
    // Create milestone
    const { data: milestoneData, error: milestoneError } = await supabase
      .from('milestones')
      .insert([{
        roadmap_id: roadmapData.id,
        title: milestoneTitle,
        description: `Learn ${milestoneTitle.toLowerCase()} as part of your ${theme.title} journey`,
        order_index: index + 1,
        status: 'pending',
        start_date: startDate.toISOString().split('T')[0], // Just the date part
        end_date: endDate.toISOString().split('T')[0] // Just the date part
      }])
      .select()
      .single();
      
    if (milestoneError) {
      console.error('Error creating milestone:', milestoneError);
      continue;
    }
    
    console.log(`Created milestone: ${milestoneData.id}`);
    
    // Create tasks for this milestone based on theme
    const taskTemplates = {
      'Web Development Mastery': {
        'Frontend Fundamentals': [
          'Learn HTML5 and semantic markup',
          'Master CSS3 and Flexbox/Grid',
          'JavaScript fundamentals and ES6+ features',
          'Responsive design principles'
        ],
        'Backend Development': [
          'Node.js and Express.js basics',
          'RESTful API design',
          'Authentication and authorization',
          'Error handling and logging'
        ],
        'Database Design': [
          'SQL fundamentals',
          'Database design principles',
          'Working with PostgreSQL',
          'ORMs and query builders'
        ],
        'Full-Stack Integration': [
          'Connecting frontend to backend',
          'State management',
          'API integration',
          'WebSockets for real-time features'
        ],
        'Deployment & DevOps': [
          'Docker basics',
          'CI/CD pipelines',
          'Cloud deployment',
          'Performance optimization'
        ]
      },
      'Data Science Journey': {
        'Python for Data Science': [
          'Python basics',
          'NumPy for numerical computing',
          'Pandas for data manipulation',
          'Data visualization with Matplotlib'
        ],
        'Data Analysis Fundamentals': [
          'Exploratory data analysis',
          'Data cleaning techniques',
          'Feature engineering',
          'Statistical analysis'
        ],
        'Data Visualization': [
          'Advanced Matplotlib',
          'Seaborn for statistical graphics',
          'Interactive visualizations',
          'Dashboard creation'
        ],
        'Machine Learning Basics': [
          'Supervised learning',
          'Unsupervised learning',
          'Model evaluation',
          'Feature selection'
        ],
        'Advanced ML Projects': [
          'Deep learning with TensorFlow',
          'Natural language processing',
          'Computer vision',
          'Model deployment'
        ]
      },
      'Mobile App Development': {
        'React Native Basics': [
          'React Native setup',
          'Components and styling',
          'Navigation basics',
          'State management'
        ],
        'Navigation & State Management': [
          'React Navigation',
          'Redux for state management',
          'Context API',
          'Async storage'
        ],
        'Working with APIs': [
          'REST API integration',
          'GraphQL with Apollo',
          'Authentication flows',
          'Offline support'
        ],
        'Native Features': [
          'Camera and image picker',
          'Geolocation',
          'Push notifications',
          'Device sensors'
        ],
        'Publishing & Monetization': [
          'App store guidelines',
          'App signing',
          'In-app purchases',
          'Ad integration'
        ]
      }
    };

    // Type assertion to handle dynamic access
    const themeTasks = taskTemplates[theme.title as keyof typeof taskTemplates] as Record<string, string[]>;
    const tasks = (themeTasks && themeTasks[milestoneTitle]) || [
      `Task 1 for ${milestoneTitle}`,
      `Task 2 for ${milestoneTitle}`,
      `Task 3 for ${milestoneTitle}`
    ];

    for (let i = 0; i < tasks.length; i++) {
      const status = i === 0 ? 'in_progress' : (i === tasks.length - 1 ? 'todo' : 
        faker.helpers.arrayElement(['todo', 'in_progress', 'done']));
      
      const taskData = {
        milestone_id: milestoneData.id,
        title: tasks[i],
        description: `Learn about ${tasks[i].toLowerCase()} as part of ${milestoneTitle}`,
        status: status,
        priority: i === 0 ? 'high' : (i === tasks.length - 1 ? 'low' : 'medium'),
        order_index: i + 1,
        due_date: new Date(
          new Date().setDate(today.getDate() + index * 7 + i * Math.floor(7/tasks.length))
        ).toISOString().split('T')[0]
      };

      const { data: createdTask, error: taskError } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();
        
      if (taskError) {
        console.error('Error creating task:', taskError);
        continue;
      }

        // Create a post related to this task (30% chance)
      if (Math.random() < 0.3) {
        const postContent = `Working on task: ${tasks[i]}. `;
        
        let extendedContent = postContent;
        if (status === 'in_progress') {
          extendedContent += `I've started working on this task and making good progress. `;
          extendedContent += faker.lorem.paragraph();
        } else if (status === 'done') {
          extendedContent += `I've completed this task! Here's what I learned: `;
          extendedContent += faker.lorem.paragraphs(1);
        } else {
          extendedContent += `Planning to start this task soon. `;
          extendedContent += faker.lorem.sentences(2);
        }

        const { error: postError } = await supabase
          .from('posts')
          .insert([{
            user_id: userId,
            content: extendedContent,
            roadmap_id: roadmapData.id,
            milestone_id: milestoneData.id,
            task_id: createdTask.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
          
        if (postError) {
          console.error('Error creating post:', postError);
        }
      }
    }
  }
  
  // Create additional posts related to the roadmap
  const roadmapPostCount = faker.number.int({ min: 1, max: 5 });
  const milestones = await supabase
    .from('milestones')
    .select('id')
    .eq('roadmap_id', roadmapData.id);
  
  for (let i = 0; i < roadmapPostCount; i++) {
    const postContent = `Update on my ${theme.title} journey: ${faker.lorem.sentence()}`;
    const mediaUrls = [];
    
    // Randomly add some media URLs (30% chance per post)
    if (Math.random() < 0.3) {
      const mediaCount = faker.number.int({ min: 1, max: 3 });
      for (let j = 0; j < mediaCount; j++) {
        mediaUrls.push(`https://picsum.photos/800/600?random=${Math.floor(Math.random() * 1000)}`);
      }
    }
    
    // Get a random milestone ID if available
    let milestoneId = null;
    if (milestones.data && milestones.data.length > 0 && faker.datatype.boolean()) {
      const randomMilestone = faker.helpers.arrayElement(milestones.data);
      milestoneId = randomMilestone.id;
    }
    
    const { error: postError } = await supabase
      .from('posts')
      .insert([{
        user_id: userId,
        content: postContent,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        roadmap_id: roadmapData.id,
        milestone_id: milestoneId,
        created_at: faker.date.recent({ days: 30 - i * 2 }).toISOString(),
        updated_at: new Date().toISOString()
      }]);
      
    if (postError) {
      console.error('Error creating post:', postError);
    }
  }
  
  return roadmapData.id;
}

// Main execution
(async () => {
  try {
    const userId = await createTestUser();
    if (!userId) {
      console.error('Failed to create test user');
      process.exit(1);
    }
    
    const roadmapId = await createTestRoadmap(userId);
    console.log('Success! Created test data with user ID:', userId, 'and roadmap ID:', roadmapId);
    process.exit(0);
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
})();
