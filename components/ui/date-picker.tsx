'use client';

import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const calendarClassNames = {
  day_selected: 'bg-primary text-primary-foreground hover:bg-primary/90',
  day_today: 'bg-accent text-accent-foreground',
  day_outside: 'text-muted-foreground opacity-50',
  caption: 'flex justify-center pt-1 relative items-center',
  caption_label: 'text-sm font-medium',
  nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
  table: 'w-full border-collapse space-y-1',
  head_row: 'flex',
  head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
  row: 'flex w-full mt-2',
  cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
  day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
};

interface DatePickerProps {
  date?: Date;
  onSelect: (date?: Date) => void;
  placeholder?: string;
  label?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
  fromDate?: Date;
  toDate?: Date;
  dateFormat?: string;
}

export function DatePicker({
  date,
  onSelect,
  placeholder = 'Pick a date',
  label,
  disabled,
  className,
  fromDate,
  toDate,
  dateFormat = 'PPP',
}: DatePickerProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {label && <label className="text-sm font-medium block">{label}</label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal overflow-hidden',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate flex-1 text-left">
              {date ? format(date, dateFormat) : <span>{placeholder}</span>}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-background rounded-md shadow-lg border border-border" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onSelect}
            disabled={disabled}
            initialFocus
            fromDate={fromDate}
            toDate={toDate}
            className="bg-background"
            classNames={calendarClassNames}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
