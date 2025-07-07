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
    
    // Prefer data-storage-path, fall back to data-original-path, then src
    const storagePath = element.getAttribute('data-storage-path') || 
                       element.getAttribute('data-original-path') || 
                       src;
    
    // Use the storage path if it's a valid path, otherwise use the src
    const pathToUse = storagePath.startsWith('notes-attachments/') ? storagePath : src;
    return `![${alt}](${pathToUse}${title ? ` "${title}"` : ''})`;
  }
});

/**
 * Convert HTML to Markdown
 */
export function toMarkdown(html: string): string {
  if (!html) return '';
  return turndownService.turndown(html || '');
}

// Configure marked with custom renderer for images
const renderer = new marked.Renderer();

// Define the image renderer with proper types
renderer.image = function({ href = '', title = null, text = '' }) {
  // The href in markdown should be the storage path
  const storagePath = href;
  
  // Generate the public URL for display
  let src = storagePath;
  if (storagePath && storagePath.startsWith('notes-attachments/')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const path = storagePath.startsWith('notes-attachments/')
        ? storagePath.substring('notes-attachments/'.length)
        : storagePath;
      src = `${supabaseUrl}/storage/v1/object/public/notes-attachments/${path}`;
    }
  }
  
  return `<img 
    src="${src}" 
    alt="${text || ''}" 
    ${title ? `title="${title}"` : ''}
    data-original-path="${storagePath}"
    data-storage-path="${storagePath}"
    class="max-w-full h-auto rounded-md"
  >`;
};

// Configure marked with basic options and custom renderer
marked.use({
  gfm: true,
  breaks: true,
  async: false,
  renderer
});

/**
 * Convert Markdown to HTML
 */
export function toHtml(markdown: string): string {
  if (!markdown) return '';
  
  try {
    const html = marked.parse(markdown) as string;
    return DOMPurify.sanitize(html);
  } catch {
    return markdown;
  }
}
