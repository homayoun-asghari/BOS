'use client';

export function MarkdownStyles() {
  return (
    <style jsx global>{`
      /* Base styles */
      .prose {
        --code-bg: hsl(var(--muted));
        --code-fg: hsl(var(--foreground));
        --pre-bg: hsl(var(--muted));
        --pre-fg: hsl(var(--foreground));
        --border-color: hsl(var(--border));
      }

      /* Blockquotes */
      .prose :where(blockquote) {
        border-left: 4px solid hsl(var(--border));
        padding: 0 0 0 1rem;
        margin: 1.5rem 0;
        color: hsl(var(--muted-foreground));
        font-style: italic;
      }

      .dark .prose :where(blockquote) {
        border-left: 4px solid #ffffff !important;
      }

      /* Tables */
      .prose :where(table) {
        width: 100% !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
        margin: 1.5rem 0 !important;
        border-radius: 0.5rem !important;
        overflow: hidden !important;
        box-shadow: 0 0 0 1px hsl(var(--border)) !important;
      }
      
      .prose :where(th, td) {
        border: 1px solid hsl(var(--border)) !important;
        padding: 0.75rem 1rem !important;
        text-align: left !important;
        background-color: hsl(var(--background)) !important;
      }
      
      .prose :where(th) {
        background-color: hsl(var(--muted)) !important;
        font-weight: 600 !important;
      }
      
      .dark .prose :where(th, td) {
        background-color: hsl(var(--muted)/0.5) !important;
      }
      
      .dark .prose :where(th) {
        background-color: hsl(var(--muted)/0.7) !important;
      }

      /* Headings */
      .prose :where(h1) {
        font-size: 2.25rem;
        line-height: 2.5rem;
        margin: 1.5rem 0;
        font-weight: 700;
        color: hsl(var(--foreground));
      }
      
      .prose :where(h2) {
        font-size: 1.875rem;
        line-height: 2.25rem;
        margin: 1.5rem 0 1rem;
        font-weight: 600;
        color: hsl(var(--foreground));
      }
      
      .prose :where(h3) {
        font-size: 1.5rem;
        line-height: 2rem;
        margin: 1.5rem 0 0.75rem;
        font-weight: 600;
        color: hsl(var(--foreground));
      }
      
      /* Inline elements */
      .prose :where(strong) {
        font-weight: 600;
        color: hsl(var(--foreground));
      }
      
      .prose :where(em) {
        font-style: italic;
      }
      
      .prose :where(a) {
        color: hsl(var(--primary));
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      /* Code blocks */
      .prose :where(pre) {
        background: var(--pre-bg);
        color: var(--pre-fg);
        padding: 1rem;
        border-radius: 0.5rem;
        overflow-x: auto;
        margin: 1.5rem 0;
        border: 1px solid var(--border-color);
      }

      .prose :where(pre code) {
        background: transparent;
        padding: 0;
        border-radius: 0;
        font-size: 0.9em;
      }

      .prose :where(code) {
        background: var(--code-bg);
        color: var(--code-fg);
        padding: 0.2em 0.4em;
        border-radius: 0.25rem;
        font-size: 0.875em;
        font-family: 'Fira Code', monospace;
      }

      /* Lists */
      .prose :where(p) {
        margin: 1.25em 0;
        line-height: 1.75;
        white-space: pre-wrap;
      }

      /* Unordered lists */
      .prose :where(ul) {
        margin: 1.25em 0;
        padding-left: 2em;
        list-style-type: disc;
      }

      /* Ordered lists */
      .prose :where(ol) {
        margin: 1.25em 0;
        padding-left: 2em;
        list-style-type: decimal;
      }

      .prose :where(li) {
        margin: 0.5em 0;
        color: hsl(var(--foreground));
      }
      
      /* Ensure list markers are visible in both light and dark modes */
      .prose :where(ul > li)::marker {
        color: hsl(var(--muted-foreground));
      }
      
      .prose :where(ol > li)::marker {
        color: hsl(var(--muted-foreground));
      }

      /* Images */
      .prose :where(img) {
        margin: 1.5rem 0;
        border-radius: 0.5rem;
        max-width: 100%;
        height: auto;
      }
    `}</style>
  );
}
