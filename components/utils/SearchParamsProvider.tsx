'use client';

import { useSearchParams as useNextSearchParams } from 'next/navigation';
import { ReactNode, createContext, useContext } from 'react';

export { useNextSearchParams };

const SearchParamsContext = createContext<URLSearchParams | null>(null);

export function SearchParamsProvider({ children }: { children: ReactNode }) {
  const searchParams = useNextSearchParams();
  
  return (
    <SearchParamsContext.Provider value={searchParams}>
      {children}
    </SearchParamsContext.Provider>
  );
}

export function useSearchParams() {
  const searchParams = useContext(SearchParamsContext);
  if (searchParams === null) {
    throw new Error('useSearchParams must be used within a SearchParamsProvider');
  }
  return searchParams;
}
