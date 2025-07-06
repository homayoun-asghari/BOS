export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface NoteFormData {
  title?: string;
  content: string;
  tags?: string[];
  type?: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export interface NoteCardProps {
  note: Pick<Note, 'id' | 'title' | 'updatedAt' | 'tags'> & {
    excerpt: string;
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}
