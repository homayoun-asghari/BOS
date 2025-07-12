'use client';

import { useState } from 'react';
import { format, addDays, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface JournalDatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function JournalDatePicker({ selectedDate, onDateChange }: JournalDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState(new Date());

  const navigateDay = (days: number) => {
    onDateChange(addDays(selectedDate, days));
  };

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date);
      setIsOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => navigateDay(-1)}
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-[200px] justify-between px-3 font-normal ${isToday(selectedDate) ? 'font-medium' : ''}`}
          >
            <div className="flex items-center">
              <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="whitespace-nowrap">
                {format(selectedDate, 'd MMM yyyy')}
              </span>
            </div>
            {isToday(selectedDate) && (
              <span className="ml-2 text-muted-foreground text-sm font-normal">
                Today
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            month={month}
            onMonthChange={setMonth}
            className="rounded-md border"
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        onClick={() => navigateDay(1)}
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
