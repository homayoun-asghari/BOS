import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

export function useMarkdownPlugins() {
  return {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeHighlight],
  };
}
