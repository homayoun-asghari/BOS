import { mergeAttributes, Node } from '@tiptap/core';
import { getSecureFileUrl } from '@/utils/secureFileUrl';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customImage: {
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        'data-original-path'?: string;
      }) => ReturnType;
    };
  }
}

export const CustomImage = Node.create({
  name: 'customImage',
  
  group: 'block',
  
  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      'data-original-path': {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: async (node) => {
          const domNode = node as HTMLElement;
          const src = domNode.getAttribute('src');
          const originalPath = domNode.getAttribute('data-original-path') || src;
          
          // If we don't have a token in the URL, try to get a secure URL
          let secureSrc = src;
          if (src && !src.includes('token=')) {
            try {
              secureSrc = await getSecureFileUrl(originalPath || src);
            } catch (error) {
              console.error('Error getting secure URL:', error);
            }
          }
          
          return {
            src: secureSrc,
            alt: domNode.getAttribute('alt'),
            title: domNode.getAttribute('title'),
            'data-original-path': originalPath
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { 'data-original-path': originalPath, ...rest } = HTMLAttributes;
    
    // Always include the original path for reference
    return ['img', mergeAttributes(rest, {
      'data-original-path': originalPath || rest.src
    })];
  },

  addCommands() {
    return {
      setImage: options => ({ commands }) => {
        // Ensure we have a data-original-path
        const attrs = {
          ...options,
          'data-original-path': options['data-original-path'] || options.src
        };
        
        // If we don't have a token in the URL, try to get a secure URL
        if (attrs.src && !attrs.src.includes('token=')) {
          getSecureFileUrl(attrs.src)
            .then(secureUrl => {
              commands.insertContent({
                type: this.name,
                attrs: {
                  ...attrs,
                  src: secureUrl
                },
              });
            })
            .catch(error => {
              console.error('Error getting secure URL:', error);
              // Fall back to original URL if secure URL fails
              commands.insertContent({
                type: this.name,
                attrs,
              });
            });
          
          // Return true to indicate the command was handled
          return true;
        }
        
        return commands.insertContent({
          type: this.name,
          attrs,
        });
      },
    };
  },
});
