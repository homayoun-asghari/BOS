// Database model
export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: Record<string, unknown>; // TipTap JSON content
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface NoteWithTags {
  id: string;
  user_id: string;
  title: string;
  content: Record<string, unknown>; // TipTap JSON content
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  content_search: string; // Full-text search vector
  tags: Array<{ 
    id: string;
    name: string;
    created_at: string;
  }>;
  pinned: boolean; // For Supabase compatibility
}

export interface NoteFormData {
  id?: string;
  title?: string;
  content?: Record<string, unknown>;
  tags?: string[];
  type?: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  is_pinned?: boolean;
}

// Component props
export interface NoteCardProps {
  id: string;
  title: string;
  content?: unknown; // TipTap JSON content
  excerpt?: string;
  updatedAt: string;
  tags?: Array<{ id: string; name: string }>;
  isPinned?: boolean;
  onPinToggle?: (id: string, pinned: boolean) => Promise<void>;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  className?: string;
}

export interface NoteListProps {
  initialNotes?: NoteWithTags[];
  onNoteClick?: (noteId: string) => void;
  onEditNote?: (noteId: string) => void;
  onDeleteNote?: (noteId: string) => Promise<void>;
  onTogglePin?: (noteId: string, pinned: boolean) => Promise<void>;
  showActions?: boolean;
}
