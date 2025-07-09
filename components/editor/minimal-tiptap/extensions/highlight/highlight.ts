import { Extension } from '@tiptap/core';

interface HighlightAttributes {
  backgroundColor?: string | null;
}

export interface HighlightOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    highlight: {
      setHighlight: (color: string) => ReturnType;
      unsetHighlight: () => ReturnType;
    };
  }
}

export const Highlight = Extension.create<HighlightOptions>({
  name: 'highlight',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          backgroundColor: {
            default: null as string | null,
            parseHTML: (element: HTMLElement) => element.style.backgroundColor?.replace(/['"]+/g, '') || null,
            renderHTML: (attributes: HighlightAttributes) => {
              if (!attributes.backgroundColor) {
                return {};
              }
              return {
                style: `background-color: ${attributes.backgroundColor}`,
              } as const;
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setHighlight: color => ({ chain }) => {
        return chain().setMark('textStyle', { backgroundColor: color }).run();
      },
      unsetHighlight: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { backgroundColor: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});
