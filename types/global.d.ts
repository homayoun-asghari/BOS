import 'react';

declare global {
  // Extend React's HTML attributes
  interface ImgHTMLAttributes<T> extends React.HTMLAttributes<T> {
    'data-original-path'?: string;
  }
  
  interface AnchorHTMLAttributes<T> extends React.HTMLAttributes<T> {
    'data-original-path'?: string;
  }

  // Extend TipTap's ImageOptions to include our custom attributes
  namespace JSX {
    interface IntrinsicElements {
      'img': React.DetailedHTMLProps<
        React.ImgHTMLAttributes<HTMLImageElement> & {
          'data-original-path'?: string;
        },
        HTMLImageElement
      >;
    }
  }
}

// Extend TipTap's Commands to include our custom attributes
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        'data-original-path'?: string;
      }) => ReturnType;
    };
  }
}
