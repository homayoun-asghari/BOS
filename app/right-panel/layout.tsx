'use client';

import { SearchParamsProvider } from '@/components/utils/SearchParamsProvider';

export default function RightPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SearchParamsProvider>
      {children}
    </SearchParamsProvider>
  );
}
