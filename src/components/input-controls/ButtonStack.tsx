'use client';

import { Minus, Plus, Settings2 } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type ButtonStackProps = {
  /** Callback for hold-based increment (receives minutes to adjust) - used by TimeSwiper */
  onHoldAdjust?: (minutes: number) => void;
  /** Called when hold starts */
  onHoldStart: (direction: 1 | -1) => void;
  /** Called when hold ends */
  onHoldStop: () => void;
  /** Position relative to main content (affects popover side) */
  position?: 'left' | 'right';
  /** Content for settings popover */
  settingsContent?: React.ReactNode;
  /** Control popover open state externally */
  settingsOpen?: boolean;
  /** Callback when popover open state changes */
  onSettingsOpenChange?: (open: boolean) => void;
  /** Optional: Disable all buttons */
  disabled?: boolean;
  /** Optional: Custom class for container */
  className?: string;
};

export function ButtonStack({
  onHoldStart,
  onHoldStop,
  position = 'right',
  settingsContent,
  settingsOpen,
  onSettingsOpenChange,
  disabled = false,
  className,
}: ButtonStackProps) {
  const popoverSide = position === 'left' ? 'right' : 'left';

  // Handle pointer events for press-and-hold
  const handlePointerDown = useCallback((direction: 1 | -1) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onHoldStart(direction);
  }, [onHoldStart]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    onHoldStop();
  }, [onHoldStop]);

  const handlePointerLeave = useCallback(() => {
    onHoldStop();
  }, [onHoldStop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      onHoldStop();
    };
  }, [onHoldStop]);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {settingsContent
        ? (
            <Popover open={settingsOpen} onOpenChange={onSettingsOpenChange}>
              <PopoverTrigger
                render={(
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={disabled}
                    className="h-10 w-10 rounded-xl border-border/50 bg-muted/30 text-foreground hover:bg-muted/50"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                )}
              />
              <PopoverContent className="w-80 p-5" side={popoverSide}>
                {settingsContent}
              </PopoverContent>
            </Popover>
          )
        : (
            <Button
              variant="outline"
              size="icon"
              disabled={disabled}
              className="h-10 w-10 rounded-xl border-border/50 bg-muted/30 text-foreground hover:bg-muted/50"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
      <Button
        variant="outline"
        size="icon"
        disabled={disabled}
        className="h-10 w-10 touch-none rounded-xl border-border/50 bg-muted/30 text-foreground select-none hover:bg-muted/50 active:scale-95"
        onPointerDown={handlePointerDown(1)}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        disabled={disabled}
        className="h-10 w-10 touch-none rounded-xl border-border/50 bg-muted/30 text-foreground select-none hover:bg-muted/50 active:scale-95"
        onPointerDown={handlePointerDown(-1)}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        <Minus className="h-4 w-4" />
      </Button>
    </div>
  );
}
