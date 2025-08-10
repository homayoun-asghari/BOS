// import { renderHook, act } from '@testing-library/react';
// import { useNoteForm } from '@/hooks/useNoteForm';
// import { supabase } from '@/lib/supabase/client';
// import { NoteFormValues } from '@/types/note-form';
// import { AuthProvider } from '@/components/auth/AuthProvider';
// import { ReactNode } from 'react';

// // Mock the supabase client
// jest.mock('@/lib/supabase/client', () => ({
//   supabase: {
//     from: jest.fn().mockReturnThis(),
//     select: jest.fn().mockReturnThis(),
//     insert: jest.fn().mockReturnThis(),
//     update: jest.fn().mockReturnThis(),
//     eq: jest.fn().mockReturnThis(),
//     single: jest.fn().mockResolvedValue({ data: { id: 'test-note-id' }, error: null }),
//     auth: {
//       getSession: jest.fn().mockResolvedValue({
//         data: { 
//           session: { 
//             user: { 
//               id: 'test-user-id',
//               email: 'test@example.com'
//             } 
//           } 
//         },
//         error: null
//       })
//     },
//   },
// }));

// // Mock the auth context
// const mockUser = {
//   id: 'test-user-id',
//   email: 'test@example.com',
// };

// const mockAuthContext = {
//   user: mockUser,
//   isLoading: false,
//   signIn: jest.fn(),
//   signOut: jest.fn(),
//   signUp: jest.fn(),
//   resetPassword: jest.fn(),
//   updatePassword: jest.fn(),
//   updateProfile: jest.fn(),
// };

// // Mock the auth provider
// jest.mock('@/components/auth/AuthProvider', () => ({
//   useAuth: () => mockAuthContext,
//   AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
// }));

// // Wrapper component to provide auth context
// const Wrapper = ({ children }: { children: ReactNode }) => (
//   <AuthProvider>{children}</AuthProvider>
// );

// describe('useNoteForm', () => {
//   beforeEach(() => {
//     // Reset all mocks before each test
//     jest.clearAllMocks();
//   });

//   it('should maintain privacy state when editing a private note', async () => {
//     const initialValues: Partial<NoteFormValues> = {
//       id: 'test-note-id',
//       title: 'Test Note',
//       content: { type: 'doc', content: [] },
//       type: 'note',
//       status: 'active',
//       is_public: false,
//       tags: [],
//       created_at: new Date(),
//       updated_at: new Date(),
//       user_id: mockUser.id,
//     };

//     const { result } = renderHook(
//       () => useNoteForm(initialValues),
//       { wrapper: Wrapper }
//     );

//     // Simulate editing the note
//     await act(async () => {
//       result.current.handleChange('content', { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated content' }] }] });
//       await result.current.saveNote();
//     });

//     // Verify the note is still private
//     expect(supabase.from('notes').update).toHaveBeenCalledWith(
//       expect.objectContaining({
//         is_public: false,
//       })
//     );
//   });

//   it('should maintain privacy state when toggling public/private multiple times', async () => {
//     const initialValues: Partial<NoteFormValues> = {
//       id: 'test-note-id',
//       title: 'Test Note',
//       content: { type: 'doc', content: [] },
//       type: 'note',
//       status: 'active',
//       is_public: false,
//       tags: [],
//       created_at: new Date(),
//       updated_at: new Date(),
//       user_id: mockUser.id,
//     };

//     const { result, rerender } = renderHook(
//       ({ values }) => useNoteForm(values),
//       {
//         wrapper: Wrapper,
//         initialProps: {
//           values: initialValues,
//         },
//       }
//     );

//     // Make the note public
//     await act(async () => {
//       result.current.onAddTag('public');
//     });

//     // Make the note private again
//     await act(async () => {
//       result.current.onRemoveTag('public');
//     });

//     // Update the hook with new props
//     rerender({
//       values: {
//         ...initialValues,
//         ...result.current.values,
//         is_public: false, // Ensure it's private now
//       },
//     });

//     // Edit the note
//     await act(async () => {
//       result.current.handleChange('content', { 
//         type: 'doc', 
//         content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated after toggle' }] }] 
//       });
//       await result.current.saveNote();
//     });

//     // Verify the note is still private
//     expect(supabase.from('notes').update).toHaveBeenLastCalledWith(
//       expect.objectContaining({
//         is_public: false,
//       })
//     );
//   });

//   it('should not change is_public when editing other fields', async () => {
//     const initialValues: Partial<NoteFormValues> = {
//       id: 'test-note-id',
//       title: 'Test Note',
//       content: { type: 'doc', content: [] },
//       type: 'note',
//       status: 'active',
//       is_public: false,
//       tags: [],
//       created_at: new Date(),
//       updated_at: new Date(),
//       user_id: mockUser.id,
//     };

//     const { result } = renderHook(
//       () => useNoteForm(initialValues),
//       { wrapper: Wrapper }
//     );

//     // Simulate multiple edits
//     await act(async () => {
//       // First edit
//       result.current.handleChange('title', 'New Title');
//       await result.current.saveNote();
      
//       // Second edit
//       result.current.handleChange('content', { 
//         type: 'doc', 
//         content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated content' }] }] 
//       });
//       await result.current.saveNote();
      
//       // Third edit
//       result.current.handleChange('title', 'Another Title');
//       await result.current.saveNote();
//     });

//     // Verify is_public was never set to true
//     const updateCalls = (supabase.from('notes').update as jest.Mock).mock.calls;
//     updateCalls.forEach(([updateData]) => {
//       expect(updateData).not.toHaveProperty('is_public', true);
//     });
//   });
// });
