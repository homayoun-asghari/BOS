interface EditorTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export default function EditorTextarea({
  value,
  onChange,
  placeholder = 'Start writing your note...',
  readOnly = false,
}: EditorTextareaProps) {
  return <textarea 
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    readOnly={readOnly}
    className="w-full min-h-[200px] p-2 border rounded"
  />;
}
