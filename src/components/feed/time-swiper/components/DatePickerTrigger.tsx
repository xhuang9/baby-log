'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatTimeSwiperDate } from '@/lib/format-log';

type DatePickerTriggerProps = {
  selectedDate: Date;
  currentTime: Date;
  onDateSelect: (date: Date) => void;
  minDate: Date;
  maxDate: Date;
};

export function DatePickerTrigger({
  selectedDate,
  currentTime,
  onDateSelect,
  minDate,
  maxDate,
}: DatePickerTriggerProps) {
  const [open, setOpen] = useState(false);
  const displayLabel = formatTimeSwiperDate(selectedDate, currentTime);

  // Don't render if today (no label to show)
  if (!displayLabel) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex items-center gap-1 text-xs font-medium text-primary underline hover:no-underline">
        {displayLabel}
        <ChevronDown className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              onDateSelect(date);
              setOpen(false);
            }
          }}
          disabled={date => date < minDate || date > maxDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
