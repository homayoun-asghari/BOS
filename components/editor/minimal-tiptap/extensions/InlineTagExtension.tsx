import { Node, mergeAttributes } from '@tiptap/core';

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
    return ({ node }) => {
      const tag = node.attrs.tag || '';
      const container = document.createElement('span');
      container.className = 'inline-tag';
      container.textContent = `#${tag}`;
      container.setAttribute('data-tag', tag);
      return {
        dom: container,
        update: (updatedNode) => {
          if (updatedNode.attrs.tag !== tag) {
            container.textContent = `#${updatedNode.attrs.tag || ''}`;
            container.setAttribute('data-tag', updatedNode.attrs.tag || '');
          }
          return true;
        }
      };
    };
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
