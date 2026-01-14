'use client';

import { MinusIcon, PlusIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TimeSwiperProps = {
  value: Date;
  onChange: (date: Date) => void;
  handMode?: 'left' | 'right';
  className?: string;
};

// Timeline constants
const HOUR_WIDTH = 100; // pixels per hour
const TOTAL_WIDTH = HOUR_WIDTH * 24;

// Physics constants for Apple-like momentum
const DECELERATION = 0.97; // Higher = longer coast
const MIN_VELOCITY = 0.1; // Stop threshold
const VELOCITY_MULTIPLIER = 0.8; // Scale touch velocity

export function TimeSwiper({
  value,
  onChange,
  handMode = 'right',
  className,
}: TimeSwiperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // Use refs for animation state to avoid stale closures
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);

  // State for rendering
  const [offset, setOffset] = useState(0);

  // Convert date to pixel offset
  const dateToOffset = useCallback((date: Date): number => {
    const minutes = date.getHours() * 60 + date.getMinutes();
    return (minutes / 60) * HOUR_WIDTH;
  }, []);

  // Convert pixel offset to date
  const offsetToDate = useCallback((pixelOffset: number, baseDate: Date): Date => {
    // Normalize offset to 0-TOTAL_WIDTH range
    let normalizedOffset = pixelOffset % TOTAL_WIDTH;
    if (normalizedOffset < 0) normalizedOffset += TOTAL_WIDTH;

    const totalMinutes = (normalizedOffset / HOUR_WIDTH) * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    const newDate = new Date(baseDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    return newDate;
  }, []);

  // Initialize offset from value
  useEffect(() => {
    if (!isDraggingRef.current && !animationRef.current) {
      const newOffset = dateToOffset(value);
      offsetRef.current = newOffset;
      setOffset(newOffset);
    }
  }, [value, dateToOffset]);

  // Stop animation
  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Momentum animation loop
  const animate = useCallback(() => {
    if (Math.abs(velocityRef.current) < MIN_VELOCITY) {
      animationRef.current = null;
      // Emit final value
      const finalDate = offsetToDate(offsetRef.current, value);
      onChange(finalDate);
      return;
    }

    // Apply deceleration
    velocityRef.current *= DECELERATION;

    // Update offset
    offsetRef.current += velocityRef.current;

    // Normalize to prevent huge numbers
    offsetRef.current = ((offsetRef.current % TOTAL_WIDTH) + TOTAL_WIDTH) % TOTAL_WIDTH;

    setOffset(offsetRef.current);

    animationRef.current = requestAnimationFrame(animate);
  }, [offsetToDate, onChange, value]);

  // Pointer handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    stopAnimation();
    isDraggingRef.current = true;
    lastXRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [stopAnimation]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const currentX = e.clientX;
    const currentTime = performance.now();
    const deltaX = lastXRef.current - currentX; // Inverted for natural scroll feel
    const deltaTime = currentTime - lastTimeRef.current;

    // Calculate velocity (weighted average for smoothness)
    if (deltaTime > 0) {
      const instantVelocity = deltaX / deltaTime * 16; // Normalize to ~60fps
      velocityRef.current = velocityRef.current * 0.7 + instantVelocity * 0.3;
    }

    // Update offset
    offsetRef.current += deltaX;
    offsetRef.current = ((offsetRef.current % TOTAL_WIDTH) + TOTAL_WIDTH) % TOTAL_WIDTH;
    setOffset(offsetRef.current);

    lastXRef.current = currentX;
    lastTimeRef.current = currentTime;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    isDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Apply velocity multiplier and start momentum
    velocityRef.current *= VELOCITY_MULTIPLIER;

    if (Math.abs(velocityRef.current) > MIN_VELOCITY) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // No momentum, just emit current value
      const finalDate = offsetToDate(offsetRef.current, value);
      onChange(finalDate);
    }
  }, [animate, offsetToDate, onChange, value]);

  // +/- hour adjustment
  const adjustHour = useCallback((delta: number) => {
    stopAnimation();
    const newDate = new Date(value);
    newDate.setHours(newDate.getHours() + delta);
    onChange(newDate);
  }, [onChange, stopAnimation, value]);

  // Format time display
  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  // Format hour label (12a, 1a, etc.)
  const formatHourLabel = (hour: number): string => {
    const h = hour % 24;
    const ampm = h >= 12 ? 'p' : 'a';
    const displayHour = h % 12 || 12;
    return `${displayHour}${ampm}`;
  };

  // Generate tick marks - every 30 minutes
  const ticks: Array<{ position: number; isHour: boolean; label: string | null }> = [];
  for (let hour = 0; hour < 24; hour++) {
    ticks.push({
      position: hour * HOUR_WIDTH,
      isHour: true,
      label: formatHourLabel(hour),
    });
    ticks.push({
      position: hour * HOUR_WIDTH + HOUR_WIDTH / 2,
      isHour: false,
      label: null,
    });
  }

  // Calculate container center
  const containerWidth = containerRef.current?.clientWidth || 300;
  const centerX = containerWidth / 2;

  // Buttons on left for right-handed users (easier thumb reach)
  const buttonsOnLeft = handMode === 'right';

  return (
    <div className={cn('select-none', className)}>
      {/* Time Display */}
      <div className="mb-3 text-center">
        <span className="text-3xl font-semibold tracking-tight">
          {formatTime(value)}
        </span>
      </div>

      {/* Main Layout */}
      <div className="flex items-stretch gap-2">
        {/* +/- Buttons - Left side */}
        {buttonsOnLeft && (
          <div className="flex flex-col justify-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl border-border/50 bg-muted/30 text-foreground hover:bg-muted/50"
              onClick={() => adjustHour(1)}
            >
              <PlusIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl border-border/50 bg-muted/30 text-foreground hover:bg-muted/50"
              onClick={() => adjustHour(-1)}
            >
              <MinusIcon className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Timeline Swiper */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-hidden rounded-2xl border border-border/30 bg-muted/20"
          style={{ height: 88 }}
        >
          {/* Touch Area */}
          <div
            className="absolute inset-0 touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
          >
            {/* Timeline Track - render 3 copies for seamless loop */}
            <div
              className="absolute top-0 flex h-full"
              style={{
                transform: `translateX(${centerX - offset - TOTAL_WIDTH}px)`,
              }}
            >
              {[0, 1, 2].map((copy) => (
                <div
                  key={copy}
                  className="relative h-full"
                  style={{ width: TOTAL_WIDTH }}
                >
                  {ticks.map((tick, i) => (
                    <div
                      key={i}
                      className="absolute flex flex-col items-center"
                      style={{ left: tick.position }}
                    >
                      {/* Hour label */}
                      {tick.label && (
                        <span className="mt-3 text-xs font-medium text-muted-foreground/70">
                          {tick.label}
                        </span>
                      )}
                      {/* Tick mark */}
                      <div
                        className={cn(
                          'mt-1 w-px',
                          tick.isHour
                            ? 'h-5 bg-muted-foreground/50'
                            : 'h-3 bg-muted-foreground/30',
                        )}
                        style={{ marginTop: tick.isHour ? 4 : 20 }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Center Indicator - Small triangle pointing up */}
          <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center">
            <svg
              width="10"
              height="16"
              viewBox="0 0 10 16"
              fill="none"
              className="text-primary"
            >
              <path
                d="M5 0L10 16H0L5 0Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        {/* +/- Buttons - Right side */}
        {!buttonsOnLeft && (
          <div className="flex flex-col justify-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl border-border/50 bg-muted/30 text-foreground hover:bg-muted/50"
              onClick={() => adjustHour(1)}
            >
              <PlusIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl border-border/50 bg-muted/30 text-foreground hover:bg-muted/50"
              onClick={() => adjustHour(-1)}
            >
              <MinusIcon className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
