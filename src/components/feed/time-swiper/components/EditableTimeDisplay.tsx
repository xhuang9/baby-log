'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type EditableTimeDisplayProps = {
  value: Date;
  onChange: (date: Date) => void;
  use24Hour: boolean;
  className?: string;
  dimmed?: boolean;
};

export function EditableTimeDisplay({
  value,
  onChange,
  use24Hour,
  className,
  dimmed = false,
}: EditableTimeDisplayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Format time for display (and for editing)
  const formatTimeDisplay = useCallback((date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();

    if (use24Hour) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }, [use24Hour]);

  // Parse input value to date - supports both 24h and 12h formats
  const parseInputToDate = useCallback((timeString: string): Date | null => {
    const trimmed = timeString.trim();

    // Try 24h format: HH:MM or H:MM
    const match24h = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match24h && match24h[1] && match24h[2]) {
      const hours = Number.parseInt(match24h[1], 10);
      const minutes = Number.parseInt(match24h[2], 10);

      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        const newDate = new Date(value);
        newDate.setHours(hours, minutes, 0, 0);
        return newDate;
      }
    }

    // Try 12h format: H:MM AM/PM or HH:MM AM/PM
    const match12h = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)$/);
    if (match12h && match12h[1] && match12h[2] && match12h[3]) {
      let hours = Number.parseInt(match12h[1], 10);
      const minutes = Number.parseInt(match12h[2], 10);
      const isPM = match12h[3].toLowerCase() === 'pm';

      if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
        // Convert to 24h
        if (isPM && hours !== 12) {
          hours += 12;
        } else if (!isPM && hours === 12) {
          hours = 0;
        }

        const newDate = new Date(value);
        newDate.setHours(hours, minutes, 0, 0);
        return newDate;
      }
    }

    return null;
  }, [value]);

  // Handle click to start editing
  const handleClick = useCallback(() => {
    setInputValue(formatTimeDisplay(value));
    setIsEditing(true);
  }, [value, formatTimeDisplay]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  // Handle blur - apply the change
  const handleBlur = useCallback(() => {
    const parsed = parseInputToDate(inputValue);
    if (parsed) {
      onChange(parsed);
    }
    setIsEditing(false);
  }, [inputValue, parseInputToDate, onChange]);

  // Handle key down
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const parsed = parseInputToDate(inputValue);
      if (parsed) {
        onChange(parsed);
      }
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  }, [inputValue, parseInputToDate, onChange]);

  if (isEditing) {
    return (
      <div className={cn('relative', className)}>
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full bg-transparent text-center text-3xl font-semibold tracking-tight outline-none',
          )}
          style={{ caretColor: 'currentColor' }}
          placeholder={use24Hour ? '00:00' : '12:00 AM'}
        />
        <div className="absolute inset-x-4 bottom-0 h-px bg-primary/50" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'relative cursor-text text-3xl font-semibold tracking-tight transition-colors',
        dimmed ? 'text-primary hover:text-primary/80' : 'hover:opacity-85',
        className,
      )}
    >
      {formatTimeDisplay(value)}
      {/* Thin underline indicator */}
      <div className="absolute inset-x-0 -bottom-0.5 h-px bg-foreground/20" />
    </button>
  );
}
