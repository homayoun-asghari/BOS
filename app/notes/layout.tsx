import { ReactNode } from 'react';

export default function NotesLayout({ children }: { children: ReactNode }) {
  return <div className="container mx-auto p-0 sm:p-4">{children}</div>;
}
