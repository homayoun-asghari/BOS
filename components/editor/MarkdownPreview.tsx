import { cn } from '@/lib/utils';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div className={cn("prose dark:prose-invert max-w-none p-4", className)}>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}
