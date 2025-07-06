interface NoteCardProps {
  note: {
    id: string;
    title: string;
    excerpt: string;
    updatedAt: string;
    tags: string[];
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  return <div>Note Card: {note.title}</div>;
}
