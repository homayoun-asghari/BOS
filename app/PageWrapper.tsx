'use client';

import { ReactNode, Suspense } from 'react';

interface PageWrapperProps {
  children: ReactNode;
  loadingText?: string;
}

export function PageWrapper({ children, loadingText = 'Loading...' }: PageWrapperProps) {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center">
          <div className="animate-pulse">{loadingText}</div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
