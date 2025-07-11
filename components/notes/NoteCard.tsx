'use client';

import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical, Pin, PinOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Local Badge component with required props
type BadgeProps = {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
  children: React.ReactNode;
};

const Badge = ({ variant = 'default', className, children }: BadgeProps) => {
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/80',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export interface NoteCardProps {
  id: string;
  title: string;
  content?: unknown; // TipTap JSON content
  excerpt?: string;
  updatedAt: string;
  tags?: Array<{ id: string; name: string }>;
  isPinned?: boolean;
  onPinToggle?: (id: string, pinned: boolean) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onNavigate?: (id: string) => void;
  className?: string;
}

export default function NoteCard({
  id,
  title,
  content,
  excerpt: propExcerpt,
  updatedAt,
  tags = [],
  isPinned = false,
  onPinToggle,
  onDelete,
  onNavigate,
  className,
}: NoteCardProps) {
  // Generate excerpt from content if not provided
  const excerpt = useMemo(() => {
    if (propExcerpt) return propExcerpt;
    
    // Handle empty content or invalid JSON
    if (!content || typeof content !== 'object') {
      return 'No content';
    }
    
    // Handle empty TipTap content
    if (Array.isArray(content) && content.length === 0) {
      return 'No content';
    }
    
    // Handle empty object
    if (typeof content === 'object' && Object.keys(content).length === 0) {
      return 'No content';
    }
    
    return extractExcerpt(content);
  }, [propExcerpt, content]);
  const handlePinToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onPinToggle) return;
    
    try {
      await onPinToggle(id, !isPinned);
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onDelete) return;
    
    try {
      await onDelete(id);
      // Prevent any navigation after delete
      return false;
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleNavigate = () => {
    if (onNavigate) {
      // Preserve current view state in URL
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view') || 'list';
      
      // Pass the current view state to the note page
      onNavigate(id);
    }
  };

  const handleOutsideClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-dropdown-menu]') || target.closest('[data-dropdown-menu-trigger]')) {
      return;
    }
    onNavigate?.(id);
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md cursor-pointer',
        isPinned && 'ring-2 ring-primary/50',
        className
      )}
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        // Prevent navigation if clicking on the delete button or its dropdown
        const target = e.target as HTMLElement;
        if (target.closest('[data-dropdown-menu]') || target.closest('[data-dropdown-menu-trigger]')) {
          return;
        }
        handleNavigate();
      }}
    >
      <div className="flex items-start justify-between p-4 pb-2">
        <h3 className="text-lg font-semibold line-clamp-2 leading-tight">
          {title || 'Untitled Note'}
        </h3>
        <div className="flex items-center gap-1">
          {onPinToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100"
              onClick={handlePinToggle}
              title={isPinned ? 'Unpin note' : 'Pin to top'}
            >
              {isPinned ? (
                <PinOff className="h-4 w-4" />
              ) : (
                <Pin className="h-4 w-4" />
              )}
            </Button>
          )}
          {onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full justify-start"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onDelete) {
                        await onDelete(id);
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </Button>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="px-4 pb-2">
        <p className="text-sm text-muted-foreground line-clamp-3">{excerpt}</p>
      </div>

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 px-4 pb-2">
              {tags.slice(0, 3).map((tag) => (
                <div key={tag.id} className="mr-1 mb-1">
                  <Badge variant="secondary" className="text-xs">
                    {tag.name}
                  </Badge>
                </div>
              ))}
              {tags.length > 3 && (
                <div className="mr-1 mb-1">
                  <Badge variant="outline" className="text-xs">
                    +{tags.length - 3} more
                  </Badge>
                </div>
              )}
        </div>
      )}

      <div className="mt-auto p-4 pt-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </span>
          {isPinned && (
            <span className="inline-flex items-center text-primary">
              <Pin className="mr-1 h-3 w-3" />
              Pinned
            </span>
          )}
        </div>
      </div>
    </div>
  );
}



// Helper function to extract text excerpt from TipTap content
function extractExcerpt(content: unknown): string {
  if (!content) return '';
  
  try {
    // Handle string content directly
    if (typeof content === 'string') {
      return content;
    }
    
    // Handle array of nodes
    if (Array.isArray(content)) {
      // If array contains multiple paragraphs, join them with a space
      const text = content.map(extractExcerpt).filter(Boolean).join(' ').trim();
      // Limit to first 150 characters
      return text.length > 150 ? text.slice(0, 150) + '...' : text;
    }
    
    // Handle object content (Tiptap node)
    if (typeof content === 'object' && content !== null) {
      // Skip image nodes
      if ('type' in content && content.type === 'image') {
        return '';
      }
      
      // Handle paragraph or heading nodes
      if ('type' in content && ['paragraph', 'heading'].includes(content.type)) {
        if ('content' in content && Array.isArray(content.content)) {
          return extractExcerpt(content.content);
        }
        return '';
      }
      
      // Check for text property
      if ('text' in content && typeof content.text === 'string') {
        return content.text;
      }
      
      // Check for content array
      if ('content' in content && Array.isArray(content.content)) {
        return extractExcerpt(content.content);
      }
      
      // Handle other properties that might contain text
      const textParts: string[] = [];
      for (const value of Object.values(content)) {
        if (typeof value === 'object' && value !== null && 'type' in value && 
            ['image', 'paragraph', 'heading'].includes(value.type)) {
          continue; // Skip image and block-level nodes
        }
        const text = extractExcerpt(value);
        if (text) textParts.push(text);
      }
      return textParts.join(' ').trim();
    }
    
    return '';
  } catch (error) {
    console.error('Error extracting excerpt:', error);
    return '';
  }
}
