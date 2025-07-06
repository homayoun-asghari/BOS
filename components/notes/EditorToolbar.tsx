interface EditorToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  // Add more editor actions as needed
}

export default function EditorToolbar({ onBold, onItalic }: EditorToolbarProps) {
  return <div>Editor Toolbar</div>;
}
