import { useState } from 'react';
import { Plus } from 'lucide-react';

interface AddTagButtonProps {
  onAddTag: (tag: string) => void;
}

export function AddTagButton({ onAddTag }: AddTagButtonProps) {
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim()) {
      onAddTag(tagInput.trim());
      setTagInput('');
    }
    setIsInputVisible(false);
  };

  if (isInputVisible) {
    return (
      <div className="relative">
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAddTag();
            } else if (e.key === 'Escape') {
              setIsInputVisible(false);
            }
          }}
          onBlur={handleAddTag}
          autoFocus
          className="text-sm border-0 border-b border-gray-300 dark:border-gray-600 bg-transparent focus:ring-0 focus:border-blue-500 p-1 w-32"
          placeholder="Tag name..."
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsInputVisible(true);
      }}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
    >
      <Plus className="h-3.5 w-3.5" />
      Add Tag
    </button>
  );
}
