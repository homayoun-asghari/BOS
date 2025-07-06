import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { Editor } from '@tiptap/react';

interface PreviewToggleProps {
  editor: Editor | null;
  isPreview: boolean;
  onTogglePreview: () => void;
}

export function PreviewToggle({ editor, isPreview, onTogglePreview }: PreviewToggleProps) {
  if (!editor) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onTogglePreview}
      className="ml-auto"
      title={isPreview ? 'Edit mode' : 'Preview mode'}
    >
      {isPreview ? (
        <>
          <EyeOff className="h-4 w-4 mr-2" />
          Exit Preview
        </>
      ) : (
        <>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </>
      )}
    </Button>
  );
}
