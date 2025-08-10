'use client';

import { useEffect } from 'react';

export default function NotFound() {
  // Add data attribute to identify this as a not-found page
  useEffect(() => {
    document.documentElement.setAttribute('data-page-type', 'not-found');
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

    </div>
  );
}
