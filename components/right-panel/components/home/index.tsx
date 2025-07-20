'use client';

import { StatsSection } from './StatsSection';
import { HistorySection } from './HistorySection';

export function Home() {
  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0">
        <StatsSection />
      </div>
      <div className="flex-1 min-h-0">
        <HistorySection />
      </div>
    </div>
  );
}
