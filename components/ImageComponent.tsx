'use client';

import { NodeViewContent, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { ImageWithSignedUrl } from './editor/ImageWithSignedUrl';

interface ImageComponentProps extends Omit<NodeViewProps, 'node'> {
  node: {
    attrs: {
      'data-storage-path'?: string;
      alt?: string;
      title?: string;
    };
  };
}

export const ImageComponent = (props: ImageComponentProps) => {
  const { node } = props;
  const { attrs } = node;
  const { 'data-storage-path': storagePath, alt, title } = attrs;

  if (!storagePath) {
    return (
      <NodeViewWrapper>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: No storage path provided for image
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="image-component">
      <div className="relative">
        <ImageWithSignedUrl 
          storagePath={storagePath}
          alt={alt || ''}
          title={title || undefined}
          className="max-w-full h-auto rounded-md"
        />
      </div>
      <NodeViewContent />
    </NodeViewWrapper>
  );
};

export default ImageComponent;
