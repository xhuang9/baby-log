'use client';

import { MinusIcon, PlusIcon, Settings2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type ButtonStackProps = {
  /** Callback for + button */
  onIncrement: () => void;
  /** Callback for - button */
  onDecrement: () => void;
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
  onIncrement,
  onDecrement,
  position = 'right',
  settingsContent,
  settingsOpen,
  onSettingsOpenChange,
  disabled = false,
  className,
}: ButtonStackProps) {
  const popoverSide = position === 'left' ? 'right' : 'left';

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
                    <Settings2Icon className="h-4 w-4" />
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
              <Settings2Icon className="h-4 w-4" />
            </Button>
          )}
      <Button
        variant="outline"
        size="icon"
        disabled={disabled}
        className="h-10 w-10 rounded-xl border-border/50 bg-muted/30 text-foreground hover:bg-muted/50"
        onClick={onIncrement}
      >
        <PlusIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        disabled={disabled}
        className="h-10 w-10 rounded-xl border-border/50 bg-muted/30 text-foreground hover:bg-muted/50"
        onClick={onDecrement}
      >
        <MinusIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
