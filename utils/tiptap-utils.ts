import { TiptapNode } from '@/types/tiptap';

export const extractTextFromNode = (node: TiptapNode | null | undefined): string => {
  if (!node) return '';

  if ('text' in node && node.text) {
    return node.text;
  }

  if ('content' in node && Array.isArray(node.content)) {
    return node.content.map(extractTextFromNode).join(' ').trim();
  }

  return '';
};

export const extractFirstLine = (content: string): string => {
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
  return lines[0] || 'Untitled Note';
};

export const fixNestedDocument = (node: TiptapNode | null | undefined): TiptapNode | null => {
  if (!node) return null;
  const newNode = { ...node };

  if (newNode.type === 'text' && 
      typeof newNode.text === 'object' && 
      newNode.text && 
      'type' in newNode.text) {
    return {
      ...newNode,
      text: ''
    };
  }

  if (newNode.content?.length) {
    newNode.content = newNode.content
      .map(fixNestedDocument)
      .filter((n): n is TiptapNode => n !== null);
  }

  return newNode;
};

export const processContent = (content: unknown): TiptapNode | null => {
  if (!content) return null;
  
  try {
    const contentObj = typeof content === 'string' ? JSON.parse(content) : content;
    return fixNestedDocument(contentObj as TiptapNode);
  } catch (error) {
    console.error('Error processing content:', error);
    return null;
  }
};
