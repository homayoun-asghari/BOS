import { TypeDropdown } from './TypeDropdown';
import { StatusDropdown } from './StatusDropdown';
import { AddTagButton } from './AddTagButton';

interface TagbarProps {
  type: string | null;
  status: string | null;
  tags: string[];
  onTypeChange: (type: string) => void;
  onStatusChange: (status: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export function Tagbar({
  type,
  status,
  tags,
  onTypeChange,
  onStatusChange,
  onAddTag,
  onRemoveTag,
}: TagbarProps) {
  return (
    <div className="border-b border-border px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <TypeDropdown 
          value={type}
          onChange={onTypeChange}
        />
        
        <StatusDropdown 
          value={status}
          onChange={onStatusChange}
        />
        
        <AddTagButton onAddTag={onAddTag} />
        
        {tags.map((tag) => (
          <span 
            key={tag}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          >
            {tag}
            <button 
              type="button"
              onClick={() => onRemoveTag(tag)}
              className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-200 text-blue-500 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-300 dark:hover:bg-blue-700"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
