import { Node, mergeAttributes, Command } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    collapsibleHeading: {
      setCollapsibleHeading: (level: number) => ReturnType;
      toggleCollapsibleHeading: (level: number) => ReturnType;
    };
  }
}

export interface CollapsibleHeadingOptions {
  levels: number[];
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface NodeConfig<Options, Storage> {
    [key: string]: any;
  }
}

export const CollapsibleHeading = Node.create<CollapsibleHeadingOptions>({
  name: 'collapsibleHeading',
  
  addOptions() {
    return {
      levels: [1, 2, 3, 4, 5, 6],
      HTMLAttributes: {},
    };
  },

  content: 'inline*',
  
  group: 'block',
  
  defining: true,

  addAttributes() {
    return {
      level: {
        default: 1,
        rendered: false,
      },
      collapsed: {
        default: false,
      },
      'data-collapsed': {
        default: false,
        parseHTML: element => element.getAttribute('data-collapsed') === 'true',
      },
    };
  },

  parseHTML() {
    return this.options.levels.map((level: number) => ({
      tag: `h${level}`,
      attrs: { level },
    }));
  },

  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level || 1;
    const isCollapsed = node.attrs.collapsed || false;
    
    return [
      'div',
      { 
        ...mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
        'data-type': 'collapsible-heading',
        'data-level': level,
        'data-collapsed': isCollapsed,
        class: `collapsible-heading level-${level} ${isCollapsed ? 'collapsed' : ''}`,
      },
      [
        'div',
        { 
          class: 'heading-content',
          'data-placeholder': `Heading ${level}`,
        },
        0, // This is where the heading content will be rendered
      ],
    ];
  },

  addCommands() {
    return {
      setCollapsibleHeading: (level: number): Command => ({ commands }) => {
        if (!this.options.levels.includes(level)) {
          return false;
        }

        return commands.setNode(this.name, { level });
      },
      
      toggleCollapsibleHeading: (level: number): Command => ({ commands, editor }) => {
        if (!this.options.levels.includes(level)) {
          return false;
        }

        const { state } = editor;
        const { $from } = state.selection;
        const node = $from.node($from.depth);
        
        if (node && node.type.name === this.name && node.attrs.level === level) {
          return commands.updateAttributes(this.name, {
            collapsed: !node.attrs.collapsed,
          });
        }
        
        return commands.setNode(this.name, { level });
      },
    };
  },

  addKeyboardShortcuts() {
    const shortcuts: Record<string, () => boolean> = {};
    
    // Add shortcuts for each heading level (Ctrl+Alt+1-6)
    this.options.levels.forEach((level: number) => {
      shortcuts[`Mod-Alt-${level}`] = () => 
        this.editor.commands.toggleCollapsibleHeading(level);
    });
    
    return shortcuts;
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const level = node.attrs.level || 1;
      const isCollapsed = node.attrs.collapsed || false;
      
      const dom = document.createElement('div');
      const content = document.createElement('div');
      
      dom.className = `collapsible-heading level-${level} ${isCollapsed ? 'collapsed' : ''}`;
      dom.setAttribute('data-type', 'collapsible-heading');
      dom.setAttribute('data-level', level);
      dom.setAttribute('data-collapsed', isCollapsed);
      
      content.className = 'heading-content';
      content.setAttribute('data-placeholder', `Heading ${level}`);
      
      // Add click handler to toggle collapse state
      const handleClick = (e: MouseEvent) => {
        if (e.target instanceof HTMLElement && e.target.closest('.heading-content')) {
          const view = editor.view;
          const pos = getPos();
          
          if (typeof pos === 'number') {
            view.dispatch(
              view.state.tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                collapsed: !isCollapsed,
              })
            );
          }
        }
      };
      
      dom.addEventListener('click', handleClick);
      dom.appendChild(content);
      
      return {
        dom,
        contentDOM: content,
        destroy: () => {
          dom.removeEventListener('click', handleClick);
        },
      };
    };
  },
});
