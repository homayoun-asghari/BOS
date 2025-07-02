'use client';

import { useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';

const MAX_GOAL_LENGTH = 50;

interface GoalSectionProps {
  goal: string;
  onGoalChange: (goal: string) => void;
  startDate?: Date;
  onStartDateChange: (date?: Date) => void;
  endDate?: Date;
  onEndDateChange: (date?: Date) => void;
}

export function GoalSection({
  goal,
  onGoalChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}: GoalSectionProps) {
  // Set default start date if not already set
  useEffect(() => {
    if (!startDate) {
      onStartDateChange(new Date());
    }
  }, [onStartDateChange, startDate]);
  return (
    <div className="space-y-4">
      <div className="relative">
        <Textarea
          placeholder="Add Your Final Goal"
          value={goal}
          onChange={(e) => {
            if (e.target.value.length <= MAX_GOAL_LENGTH) {
              onGoalChange(e.target.value);
            }
          }}
          className="min-h-[40px] max-h-[40px] resize-none pr-16"
        />
        <div className="absolute right-2 bottom-2 text-xs text-muted-foreground">
          {goal.length}/{MAX_GOAL_LENGTH}
        </div>
      </div>
      
      
        <div className="grid grid-cols-2 gap-4 pt-2">
          <DatePicker
            date={startDate}
            onSelect={onStartDateChange}
            label="Start Date"
            placeholder="Pick start date"
          />
          <DatePicker
            date={endDate}
            onSelect={onEndDateChange}
            label="End Date"
            placeholder="Pick end date"
            fromDate={startDate}
            disabled={(date) => startDate ? date < startDate : false}
          />
        </div>

    </div>
  );
}
