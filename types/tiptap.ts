export interface TiptapTextNode {
  type: 'text';
  text: string;
  marks?: unknown[];
  [key: string]: unknown;
}

export interface TiptapDocNode {
  type: 'doc';
  content: TiptapNode[];
  [key: string]: unknown;
}

export interface TiptapParagraphNode {
  type: 'paragraph';
  content?: TiptapNode[];
  text?: string;
  [key: string]: unknown;
}

export type TiptapNode = TiptapTextNode | TiptapDocNode | TiptapParagraphNode | {
  type: string;
  content?: TiptapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: unknown[];
  [key: string]: unknown;
};

export type TiptapContent = TiptapDocNode;
