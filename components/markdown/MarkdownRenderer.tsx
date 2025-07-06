'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { MarkdownStyles } from './MarkdownStyles';
import { markdownComponents } from './MarkdownComponents';
import { useMarkdownPlugins } from './useMarkdownPlugins';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const { remarkPlugins, rehypePlugins } = useMarkdownPlugins();

  return (
    <div className={cn('prose dark:prose-invert max-w-none', className)}>
      <MarkdownStyles />
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
