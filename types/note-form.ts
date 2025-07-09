import { TiptapContent } from './tiptap';

export interface NoteFormValues {
  id?: string;
  title: string;
  content: TiptapContent | string | null;
  type: string | null;
  status: string | null;
  tags: string[];
  created_at?: Date | null;
  updated_at?: Date | null;
  user_id?: string;
}

export const DEFAULT_NOTE_VALUES: Omit<NoteFormValues, 'id'> = {
  title: '',
  content: null,
  type: null,
  status: null,
  tags: [],
  created_at: null,
  updated_at: null
};
