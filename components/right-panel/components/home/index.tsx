'use client';

import { StatsSection } from './StatsSection';
import { HistorySection } from './HistorySection';

export function Home() {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div>
        <StatsSection />
      </div>
      <div>
        <HistorySection />
      </div>
    </div>
  );
}
