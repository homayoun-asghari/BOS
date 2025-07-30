'use client';

import { useState } from 'react';
import { format, addDays, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

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

  // Format month and year for display
  const monthYear = format(month, 'MMMM yyyy');

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => navigateDay(-1)}
        className="h-9 w-9 rounded-lg hover:bg-accent/90 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous day</span>
      </Button>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-9 w-[200px] justify-between rounded-lg px-3 font-normal',
              'hover:bg-accent/90 hover:text-accent-foreground',
              'focus:ring-2 focus:ring-ring focus:ring-offset-2',
              isToday(selectedDate) && 'font-medium bg-accent/20',
              isOpen && 'ring-2 ring-ring ring-offset-2',
              'transition-colors duration-200'
            )}
          >
            <div className="flex items-center">
              <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="whitespace-nowrap text-sm">
                {format(selectedDate, 'd MMM yyyy')}
              </span>
            </div>
            <div className="flex items-center">
              {isToday(selectedDate) && (
                <span className="mr-2 text-xs text-muted-foreground">
                  Today
                </span>
              )}
              <ChevronDown className={cn(
                'h-4 w-4 transition-transform duration-200',
                isOpen ? 'rotate-180' : ''
              )} />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 rounded-lg shadow-lg border border-border"
          align="center"
          sideOffset={4}
        >
          <div className="p-2">
            <div className="relative">
              <div className="flex justify-between items-center px-3 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMonth(addDays(month, -30))}
                  className="h-7 w-7 p-0 hover:bg-accent/50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {monthYear}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMonth(addDays(month, 30))}
                  className="h-7 w-7 p-0 hover:bg-accent/50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={handleSelect}
                month={month}
                onMonthChange={setMonth}
                className="border-0 [&_.rdp-caption]:hidden"
                classNames={{
                  months: 'flex flex-col space-y-4',
                  month: 'space-y-2',
                  caption: 'hidden',
                  caption_label: 'hidden',
                  nav: 'hidden',
                  table: 'w-full border-collapse space-y-1',
                  head_row: 'flex',
                  head_cell: 'text-muted-foreground rounded-md w-9 text-xs font-normal',
                  row: 'flex w-full mt-1',
                  cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                  day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md',
                  day_selected: 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                  day_today: 'bg-accent/50 text-accent-foreground',
                  day_outside: 'text-muted-foreground opacity-50',
                  day_disabled: 'text-muted-foreground opacity-50',
                  day_range_middle: 'aria-selected:bg-accent/50 aria-selected:text-accent-foreground',
                  day_hidden: 'invisible',
                }}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        onClick={() => navigateDay(1)}
        className="h-9 w-9 rounded-lg hover:bg-accent/90 transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next day</span>
      </Button>
    </div>
  );
}
