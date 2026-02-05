'use client';

import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useDurationInput } from '../hooks/useDurationInput';

type EditableDurationInputProps = {
  durationMinutes: number;
  onDurationChange: (minutes: number) => void;
  showDash?: boolean;
  showUnderline?: boolean;
  className?: string;
};

export function EditableDurationInput({
  durationMinutes,
  onDurationChange,
  showDash = false,
  showUnderline = false,
  className,
}: EditableDurationInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hoursInputRef = useRef<HTMLInputElement>(null);
  const minutesInputRef = useRef<HTMLInputElement>(null);

  const {
    isEditing,
    hoursInput,
    minutesInput,
    setHoursInput,
    setMinutesInput,
    startEditing,
    parseAndApply,
    handleKeyDown,
  } = useDurationInput({
    durationMinutes,
    onDurationChange,
  });

  // Focus hours input when editing starts (if there are hours) or minutes if not
  useEffect(() => {
    if (isEditing) {
      if (durationMinutes >= 60 && hoursInputRef.current) {
        hoursInputRef.current.focus();
        hoursInputRef.current.select();
      } else if (minutesInputRef.current) {
        minutesInputRef.current.focus();
        minutesInputRef.current.select();
      }
    }
  }, [isEditing, durationMinutes]);

  // Handle blur - only apply if clicking outside the container
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Check if the new focus target is within our container
    const relatedTarget = e.relatedTarget as Node | null;
    if (containerRef.current && relatedTarget && containerRef.current.contains(relatedTarget)) {
      // Clicking between inputs, don't close
      return;
    }
    parseAndApply();
  }, [parseAndApply]);

  // Format duration for display (shorter format: "30m" or "1h 30m")
  const formatDisplayDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (isEditing) {
    return (
      <div ref={containerRef} className={cn('relative flex items-center justify-center gap-1', className)}>
        <div className="flex items-baseline gap-0.5">
          <input
            ref={hoursInputRef}
            type="text"
            inputMode="numeric"
            value={hoursInput}
            onChange={e => setHoursInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="0"
            className="w-6 bg-transparent text-center font-semibold outline-none placeholder:text-muted-foreground/50"
            maxLength={2}
          />
          <span className="font-semibold text-muted-foreground">h</span>
        </div>
        <div className="flex items-baseline gap-0.5">
          <input
            ref={minutesInputRef}
            type="text"
            inputMode="numeric"
            value={minutesInput}
            onChange={e => setMinutesInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="0"
            className="w-6 bg-transparent text-center font-semibold outline-none placeholder:text-muted-foreground/50"
            maxLength={2}
          />
          <span className="font-semibold text-muted-foreground">m</span>
        </div>
        {/* Underline for edit mode - only show if enabled */}
        {showUnderline && (
          <div className="absolute inset-x-0 -bottom-0.5 h-px bg-primary/50" />
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className={cn(
        'relative cursor-text font-semibold transition-colors hover:text-foreground',
        className,
      )}
    >
      {showDash ? '—' : formatDisplayDuration(durationMinutes)}
      {/* Underline - only show if enabled */}
      {showUnderline && (
        <div className="absolute inset-x-0 -bottom-0.5 h-px bg-foreground/20" />
      )}
    </button>
  );
}
