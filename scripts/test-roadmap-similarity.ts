// import { createClient } from '@supabase/supabase-js';
// import { faker } from '@faker-js/faker';
// import * as dotenv from 'dotenv';
// import * as path from 'path';

// // Load environment variables from .env.local
// dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// // Get environment variables
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// if (!supabaseUrl || !supabaseKey) {
//   console.error('Error: Missing required environment variables.');
//   console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '***SET***' : 'MISSING');
//   console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '***SET***' : 'MISSING');
//   process.exit(1);
// }

// // Initialize Supabase client directly
// const supabase = createClient(supabaseUrl, supabaseKey, {
//   auth: {
//     autoRefreshToken: false,
//     persistSession: false
//   }
// });

// // Simple vector service implementation for testing
// const vectorService = {
//   async updateRoadmapVector(userId: string, data: any) {
//     console.log(`Updating vector for user ${userId}`);
//     return { data: null, error: null };
//   }
// };

// // Theme-based roadmap templates
// const ROADMAP_THEMES = [
//   {
//     title: 'Web Development Mastery',
//     description: 'Become a full-stack web developer',
//     goal: 'Build and deploy a full-stack web application',
//     milestones: [
//       'Learn HTML/CSS Fundamentals',
//       'Master JavaScript & TypeScript',
//       'Frontend Frameworks (React/Next.js)',
//       'Backend Development (Node.js, Express)',
//       'Database Design & Deployment'
//     ],
//     tasks: {
//       'HTML/CSS': ['Semantic HTML', 'CSS Grid & Flexbox', 'Responsive Design'],
//       'JavaScript': ['ES6+ Features', 'Async Programming', 'DOM Manipulation'],
//       'Frontend': ['React Components', 'State Management', 'API Integration'],
//       'Backend': ['RESTful APIs', 'Authentication', 'Error Handling'],
//       'Database': ['SQL/NoSQL', 'Migrations', 'Performance Optimization']
//     }
//   },
//   {
//     title: 'Data Science Journey',
//     description: 'From data analysis to machine learning',
//     goal: 'Complete a data science project end-to-end',
//     milestones: [
//       'Python for Data Science',
//       'Data Analysis with Pandas',
//       'Data Visualization',
//       'Machine Learning Basics',
//       'Real-world Project'
//     ],
//     tasks: {
//       'Python': ['NumPy', 'Pandas', 'Matplotlib'],
//       'Analysis': ['Data Cleaning', 'Exploratory Analysis', 'Feature Engineering'],
//       'Viz': ['Seaborn', 'Plotly', 'Dashboarding'],
//       'ML': ['Scikit-learn', 'Model Evaluation', 'Hyperparameter Tuning'],
//       'Project': ['Problem Definition', 'Data Collection', 'Model Deployment']
//     }
//   }
//   // Add more themes as needed
// ];

// // Define a single, unified set of TipTap types
// interface TipTapBaseNode {
//   type: string;
//   [key: string]: unknown;
// }

// interface TipTapTextNode extends TipTapBaseNode {
//   type: 'text';
//   text: string;
// }

// interface TipTapParagraphNode extends TipTapBaseNode {
//   type: 'paragraph';
//   content: TipTapNode[];
// }

// interface TipTapListItemNode extends TipTapBaseNode {
//   type: 'listItem';
//   content: TipTapParagraphNode[];
// }

// interface TipTapBulletListNode extends TipTapBaseNode {
//   type: 'bulletList';
//   content: TipTapListItemNode[];
// }

// type TipTapNode = 
//   | TipTapTextNode 
//   | TipTapParagraphNode 
//   | TipTapListItemNode 
//   | TipTapBulletListNode
//   | TipTapBaseNode;

// interface TipTapDocument extends TipTapBaseNode {
//   type: 'doc';
//   content: TipTapNode[];
// }

// // Helper function to safely process TipTap content
// function processTipTapContent(content: TipTapDocument): string {
//   if (!content?.content || !Array.isArray(content.content)) return '';
  
//   let result = '';
  
//   const processNode = (node: TipTapNode) => {
//     if (node && typeof node === 'object') {
//       if ('text' in node && typeof node.text === 'string') {
//         result += ' ' + node.text;
//       }
      
//       if ('content' in node && Array.isArray(node.content)) {
//         node.content.forEach(processNode);
//       }
//     }
//   };
  
//   content.content.forEach(processNode);
//   return result.trim();
// }

// // Wrapper function for backward compatibility
// function extractTextFromContent(content: TipTapDocument): string {
//   return processTipTapContent(content);
// }

// // Generate a random post in TipTap JSON format
// function generatePostContent(type: 'update' | 'question' | 'resource'): TipTapDocument {
//   const baseContent: TipTapDocument = {
//     type: 'doc',
//     content: [
//       {
//         type: 'paragraph',
//         content: [
//           {
//             type: 'text',
//             text: type === 'update' ? 
//               `Update: ${faker.lorem.sentence()}` :
//               type === 'question' ?
//               `Question: ${faker.lorem.sentence()}` :
//               `Resource: ${faker.lorem.words(3)}`
//           }
//         ]
//       }
//     ]
//   };

//   // Add more content based on type
//   if (type === 'update') {
//     const updateContent: TipTapParagraphNode = {
//       type: 'paragraph',
//       content: [{
//         type: 'text',
//         text: faker.lorem.paragraphs(2)
//       }]
//     };
//     baseContent.content.push(updateContent);
//   } else if (type === 'question') {
//     const questionContent: TipTapBulletListNode = {
//       type: 'bulletList',
//       content: Array(3).fill(0).map((): TipTapListItemNode => ({
//         type: 'listItem',
//         content: [{
//           type: 'paragraph',
//           content: [{
//             type: 'text',
//             text: faker.lorem.sentence()
//           }]
//         }]
//       }))
//     };
//     baseContent.content.push(questionContent);
//   } else {
//     const resourceContent: TipTapParagraphNode = {
//       type: 'paragraph',
//       content: [{
//         type: 'text',
//         text: `Check out this resource: ${faker.internet.url()}`
//       }]
//     };
//     baseContent.content.push(resourceContent);
//   }

//   return baseContent;
// }

// // Create test users, roadmaps, and posts
// async function createTestData(userCount = 3) {
//   const userIds = [];
  
//   // Create test users
//   for (let i = 0; i < userCount; i++) {
//     // Create a test user directly in the database
//     const email = `testuser${Date.now()}@test.com`;
//     const username = `testuser${Date.now()}`;
//     const fullName = faker.person.fullName();
//     const avatarUrl = faker.image.avatar();
    
//     console.log(`Creating test user ${i + 1} with username: ${username}`);
    
//     // Insert user directly into auth.users table
//     const { data: userData, error: userError } = await supabase
//       .from('profiles')
//       .insert([{
//         id: crypto.randomUUID(),
//         username,
//         full_name: fullName,
//         avatar_url: avatarUrl,
//         email,
//         updated_at: new Date().toISOString()
//       }])
//       .select()
//       .single();
      
//     if (userError) {
//       console.error(`❌ Error creating test user ${i + 1}:`, userError);
//       continue;
//     }
    
//     const userId = userData.id;
    
//     console.log(`Created user ${i + 1}/${userCount}: ${username}`);
    
//     // Select a random theme for this user's roadmap
//     const theme = faker.helpers.arrayElement(ROADMAP_THEMES);
    
//     // Create roadmap
//     const { data: roadmapData, error: roadmapError } = await supabase
//       .from('roadmaps')
//       .insert([{
//         user_id: userId,
//         title: theme.title,
//         description: theme.description,
//         final_goal: theme.goal,
//         is_public: true,
//         status: 'published',
//         start_date: faker.date.recent({ days: 30 }).toISOString(),
//         end_date: faker.date.soon({ days: 90 }).toISOString(),
//         // Using a placeholder image URL since faker's technology method doesn't exist
//         cover_image_url: `https://picsum.photos/800/400?random=${Math.floor(Math.random() * 1000)}`
//       }])
//       .select()
//       .single();
      
//     if (roadmapError) throw roadmapError;
    
//     // Create milestones and tasks
//     for (let m = 0; m < theme.milestones.length; m++) {
//       const milestoneTitle = theme.milestones[m];
//       const { data: milestoneData, error: milestoneError } = await supabase
//         .from('milestones')
//         .insert([{
//           user_id: userId,
//           title: theme.title,
//           description: theme.description,
//           final_goal: theme.goal,
//           is_public: true,
//           status: 'published',
//           start_date: faker.date.recent({ days: 30 }).toISOString(),
//           end_date: faker.date.soon({ days: 90 }).toISOString(),
//           // Using a placeholder image URL since faker's technology method doesn't exist
//           cover_image_url: `https://picsum.photos/800/400?random=${Math.floor(Math.random() * 1000)}`
//         }])
//         .select()
//         .single();
        
//       if (roadmapError) throw roadmapError;
      
//       // Create milestones and tasks
//       for (let m = 0; m < theme.milestones.length; m++) {
//         const milestoneTitle = theme.milestones[m];
//         const { data: milestoneData, error: milestoneError } = await supabase
//           .from('milestones')
//           .insert([{
//             roadmap_id: roadmapData.id,
//             title: milestoneTitle,
//             description: `Learn ${milestoneTitle.toLowerCase()}`,
//             status: m === 0 ? 'in_progress' : 'pending',
//             order_index: m + 1,
//             start_date: faker.date.soon({ days: m * 7 }).toISOString(),
//             end_date: faker.date.soon({ days: (m + 1) * 14 }).toISOString()
//           }])
//           .select()
//           .single();
          
//         if (milestoneError) throw milestoneError;
        
//         // Create tasks for this milestone
//         const taskCategories = Object.keys(theme.tasks) as Array<keyof typeof theme.tasks>;
//         const taskCategory = taskCategories[m % taskCategories.length];
//         const taskTitles = theme.tasks[taskCategory] || [];
        
//         for (let t = 0; t < taskTitles.length; t++) {
//           await supabase
//             .from('tasks')
//             .insert([{
//               milestone_id: milestoneData.id,
//               title: taskTitles[t],
//               description: `Task: ${taskTitles[t].toLowerCase()}`,
//               is_completed: t === 0 && m === 0, // First task of first milestone is completed
//               order: t + 1,
//               created_at: new Date().toISOString(),
//               updated_at: new Date().toISOString()
//             }]);
//         }
//       }
      
//           // Create posts related to this roadmap
//       const postTypes = ['update', 'question', 'resource'] as const;
//       for (let p = 0; p < 5; p++) {
//         const postType = postTypes[p % postTypes.length];
//         const postContent = generatePostContent(postType);
//         const postText = extractTextFromContent(postContent);
        
//         await supabase
//           .from('posts')
//           .insert([{
//             user_id: userId,
//             roadmap_id: roadmapData.id,
//             title: `${postType.charAt(0).toUpperCase() + postType.slice(1)}: ${faker.lorem.words(3)}`,
//             content: postContent as unknown as Record<string, unknown>, // Type assertion for Supabase
//             content_text: postText,
//             is_published: true,
//             created_at: faker.date.recent({ days: 30 - p * 2 }).toISOString(),
//             updated_at: new Date().toISOString()
//           }]);
//       }
      
//             // Define types for roadmap data
//       interface RoadmapTask {
//         title: string;
//         description: string | null;
//       }
      
//       interface RoadmapMilestone {
//         title: string;
//         description: string | null;
//         tasks: RoadmapTask[];
//       }
      
//       interface FullRoadmap {
//         final_goal: string | null;
//         milestones: RoadmapMilestone[] | null;
//       }

//       // Update vector with the actual roadmap data
//       const { data: fullRoadmap, error: roadmapFetchError } = await supabase
//         .from('roadmaps')
//         .select(`
//           final_goal,
//           milestones:milestones (
//             title,
//             description,
//             tasks (
//               title,
//               description
//             )
//           )
//         `)
//         .eq('id', roadmapData.id)
//         .single<FullRoadmap>();
        
//       if (!roadmapFetchError && fullRoadmap) {
//         const roadmapData = {
//           goal: fullRoadmap.final_goal || '',
//           milestones: (fullRoadmap.milestones || []).map(milestone => ({
//             title: milestone.title,
//             description: milestone.description || '',
//             tasks: (milestone.tasks || []).map(task => ({
//               title: task.title,
//               description: task.description || ''
//             }))
//           }))
//         };
        
//         await vectorService.updateRoadmapVector(userId, roadmapData);
//       }
      
//       userIds.push(userId);
//       console.log(`✅ Created roadmap and posts for user ${username}`);
      
//     } catch (error) {
//       console.error(`❌ Error creating test data for user ${i + 1}:`, error);
//     }
//   }
  
//   // Create posts related to this roadmap
//   try {
//     const postTypes = ['update', 'question', 'resource'] as const;
//     for (let p = 0; p < 5; p++) {
//       const postType = postTypes[p % postTypes.length];
//       const postContent = generatePostContent(postType);
//       const postText = extractTextFromContent(postContent);
      
//       await supabase
//         .from('posts')
//         .insert([{
//           user_id: userId,
//           roadmap_id: roadmapData.id,
//           title: `${postType.charAt(0).toUpperCase() + postType.slice(1)}: ${faker.lorem.words(3)}`,
//           content: postContent as unknown as Record<string, unknown>,
//           content_text: postText,
//           is_published: true,
//           created_at: faker.date.recent({ days: 30 - p * 2 }).toISOString(),
//           updated_at: new Date().toISOString()
//         }]);
//     }
//   } catch (error) {
//     console.error('Error creating posts:', error);
//   }
  
//   // Define types for roadmap data
//   interface RoadmapTask {
//     title: string;
//     description: string | null;
//   }
  
//   interface RoadmapMilestone {
//     title: string;
//     description: string | null;
//     tasks: RoadmapTask[];
//   }
  
//   interface FullRoadmap {
//     final_goal: string | null;
//     milestones: RoadmapMilestone[] | null;
//   }

//   // Update vector with the actual roadmap data
//   try {
//     const { data: fullRoadmap, error: roadmapFetchError } = await supabase
//       .from('roadmaps')
//       .select(`
//         final_goal,
//         milestones:milestones (
//           title,
//           description,
//           tasks (
//             title,
//             description
//           )
//         )
//       `)
//       .eq('id', roadmapData.id)
//       .single<FullRoadmap>();
      
//     if (!roadmapFetchError && fullRoadmap) {
//       const roadmapForVector = {
//         goal: fullRoadmap.final_goal || '',
//         milestones: (fullRoadmap.milestones || []).map(milestone => ({
//           title: milestone.title,
//           description: milestone.description || '',
//           tasks: (milestone.tasks || []).map(task => ({
//             title: task.title,
//             description: task.description || ''
//           }))
//         }))
//       };
      
//       await vectorService.updateRoadmapVector(userId, roadmapForVector);
//     }
    
//     userIds.push(userId);
//     console.log(`✅ Created roadmap and posts for user ${username}`);
    
//   } catch (error) {
//     console.error(`❌ Error creating test data for user ${i + 1}:`, error);
//   }
  
//   return userIds;
// }

// // Test similarity search
// async function testSimilarity(ids: string[]) {
//   if (ids.length > 0) {
//     console.log('\nTesting similarity search...');
    
//     for (const userId of ids) {
//       try {
//         // Mock similarity search since we're not using the real vector service
//         console.log(`\nSimilar users for user ${userId}:`);
//         console.log("1. User test1 (Similarity: 85.42%)");
//         console.log("2. User test3 (Similarity: 76.15%)");
//         console.log("3. User test5 (Similarity: 68.90%)");
//       } catch (error) {
//         console.error(`Error finding similar users for ${userId}:`, error);
//       }
//     }

// // Main function
// async function main() {
//   console.log('Creating test data...');
//   const userIds = [];
  
//   // Create 1 test user for simplicity
//   try {
//     const userId = await createTestUser(1);
//     if (userId) {
//       userIds.push(userId);
//       console.log('\nTest user created successfully!');
//     }
//   } catch (error) {
//     console.error('Error creating test user:', error);
//   }
  
//   console.log('\nDone!');
// }

// // Run the main function
// main().catch(console.error);
