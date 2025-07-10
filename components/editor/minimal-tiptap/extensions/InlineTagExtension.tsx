import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { InlineTagView } from '../InlineTagView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineTag: {
      setInlineTag: (attributes: { tag: string }) => ReturnType;
    };
  }
}

export const InlineTag = Node.create({
  name: 'inlineTag',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,
  draggable: true,
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  addAttributes() {
    return {
      tag: {
        default: null,
        parseHTML: element => element.getAttribute('data-tag'),
        renderHTML: attributes => ({
          'data-tag': attributes.tag,
        }),
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'span[data-type="inline-tag"]',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-tag' }), `#${HTMLAttributes.tag}`];
  },
  addNodeView() {
    return ReactNodeViewRenderer(InlineTagView);
  },
  addCommands() {
    return {
      setInlineTag:
        attributes =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },
});
