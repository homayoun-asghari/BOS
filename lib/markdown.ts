import TurndownService from 'turndown';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure Turndown service with GitHub Flavored Markdown options
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  fence: '```',
  emDelimiter: '*',
  strongDelimiter: '**',
  linkStyle: 'inlined',
  linkReferenceStyle: 'full',
  bulletListMarker: '-',
});

// Handle <pre> code blocks
turndownService.addRule('codeBlock', {
  filter: ['pre'],
  replacement: function (content, node) {
    const element = node as HTMLElement;
    const language = element.getAttribute('data-language') || '';
    return `\`\`\`${language}\n${content}\n\`\`\`\n\n`;
  },
});

// Handle <img> tags
turndownService.addRule('image', {
  filter: 'img',
  replacement: function (content, node) {
    const element = node as HTMLElement;
    const src = element.getAttribute('src') || '';
    const alt = element.getAttribute('alt') || '';
    const title = element.getAttribute('title') || '';
    return `![${alt}](${src}${title ? ` "${title}"` : ''})`;
  }
});

/**
 * Convert HTML to Markdown
 */
export function toMarkdown(html: string): string {
  if (!html) return '';
  console.group('toMarkdown');
  console.log('Input HTML:', html);
  const markdown = turndownService.turndown(html);
  console.log('Output Markdown:', markdown);
  console.groupEnd();
  return markdown;
}

// Configure marked with basic options
marked.use({
  gfm: true,
  breaks: true,
  async: false
});

/**
 * Convert Markdown to HTML
 */
export function toHtml(markdown: string): string {
  if (!markdown) return '';
  
  console.group('toHtml');
  console.log('Input Markdown:', markdown);
  
  try {
    const html = marked.parse(markdown) as string;
    console.log('Parsed HTML (before sanitize):', html);
    
    const sanitized = DOMPurify.sanitize(html);
    console.log('Sanitized HTML:', sanitized);
    console.groupEnd();
    return sanitized;
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    console.groupEnd();
    return markdown;
  }
}
