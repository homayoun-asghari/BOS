import { mergeAttributes, Node } from '@tiptap/core';
import type { NodeViewRenderer, Command } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageComponent } from '../../../components/ImageComponent';

// Define command types
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customImage: {
      setImage: (options: ImageOptions) => ReturnType;
    };
  }
}

type ImageOptions = {
  'data-storage-path'?: string;
  'data-original-path'?: string;
  src?: string;
  alt?: string;
  title?: string;
};

interface ImageAttributes {
  'data-storage-path'?: string;
  'data-original-path'?: string;
  src?: string;
  alt?: string;
  title?: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customImage: {
      setImage: (options: {
        'data-storage-path'?: string;
        'data-original-path'?: string;
        src?: string;
        alt?: string;
        title?: string;
      }) => ReturnType;
    };
  }
}

export const CustomImage = Node.create({
  name: 'customImage',
  group: 'block',
  
  addNodeView(): NodeViewRenderer {
    return ReactNodeViewRenderer(ImageComponent);
  },
  
  addAttributes() {
    return {
      'data-storage-path': {
        default: '',
        parseHTML: element => element.getAttribute('data-storage-path') || '',
      },
      'data-original-path': {
        default: '',
        parseHTML: element => element.getAttribute('data-original-path') || '',
      },
      src: {
        default: '',
        parseHTML: element => element.getAttribute('src') || '',
      },
      alt: {
        default: '',
        parseHTML: element => element.getAttribute('alt') || '',
      },
      title: {
        default: '',
        parseHTML: element => element.getAttribute('title') || '',
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'img[data-storage-path], img[data-original-path]',
        getAttrs: (node: HTMLElement | string) => {
          if (typeof node === 'string') return false;
          
          const element = node as HTMLImageElement;
          const storagePath = element.getAttribute('data-storage-path') || 
                            element.getAttribute('data-original-path');
          
          if (!storagePath) return false;
          
          const attrs: ImageAttributes = {
            'data-storage-path': storagePath,
            src: element.getAttribute('src') || '',
            alt: element.getAttribute('alt') || '',
            title: element.getAttribute('title') || '',
          };
          
          return attrs;
        },
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }: { HTMLAttributes: ImageAttributes }) {
    const attrs = { ...HTMLAttributes };
    
    // If we have a storage path but no src, we'll handle that in the ImageComponent
    if (attrs['data-storage-path'] && !attrs.src) {
      attrs.src = ''; // Clear src to avoid loading issues
    }
    
    return ['img', mergeAttributes(attrs)];
  },
  
  addCommands() {
    return {
      setImage: (options: ImageOptions): Command => ({ commands }) => {
        const storagePath = options['data-storage-path'] || 
                          options['data-original-path'] || 
                          options.src;
        
        if (!storagePath) {
          console.error('No valid image source provided');
          return false;
        }
        
        const attrs: Record<string, string> = {};
        
        // Only include defined values
        if (options['data-storage-path'] !== undefined) {
          attrs['data-storage-path'] = options['data-storage-path'];
        }
        if (options['data-original-path'] !== undefined) {
          attrs['data-original-path'] = options['data-original-path'];
        }
        if (options.src !== undefined) {
          attrs.src = options.src;
        }
        if (options.alt !== undefined) {
          attrs.alt = options.alt;
        }
        if (options.title !== undefined) {
          attrs.title = options.title;
        }
        
        return commands.insertContent({
          type: this.name,
          attrs,
        });
      },
    } as unknown as {
      setImage: (options: ImageOptions) => Command;
    };
  },
});
