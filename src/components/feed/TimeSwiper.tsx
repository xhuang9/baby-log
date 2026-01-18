'use client';

import type { TimeSwiperSettingsState } from '@/components/settings';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ButtonStack } from '@/components/input-controls/ButtonStack';
import { SettingsPopoverWrapper } from '@/components/input-controls/SettingsPopoverWrapper';
import {
  DEFAULT_TIME_SWIPER_SETTINGS,
  TimeSwiperSettingsPanel,

} from '@/components/settings';
import { getUIConfig, updateUIConfig } from '@/lib/local-db/helpers/ui-config';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';

type TimeSwiperProps = {
  value: Date;
  onChange: (date: Date) => void;
  handMode?: 'left' | 'right';
  className?: string;
};

// Timeline constants
const HOUR_WIDTH = 100; // pixels per hour
const TOTAL_WIDTH = HOUR_WIDTH * 24;

// Physics constants
const MAX_ANIMATION_DURATION = 3000; // 3 seconds max

export function TimeSwiper({
  value,
  onChange,
  handMode = 'right',
  className,
}: TimeSwiperProps) {
  // Get userId directly from store (wait for hydration)
  const user = useUserStore(s => s.user);
  const userId = user?.localId;
  const isHydrated = useUserStore(s => s.isHydrated);

  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef(0);
  const initialVelocityRef = useRef(0);

  // Use refs for animation state to avoid stale closures
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);

  // State for rendering
  const [offset, setOffset] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [settings, setSettings] = useState<TimeSwiperSettingsState>(DEFAULT_TIME_SWIPER_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<TimeSwiperSettingsState>(DEFAULT_TIME_SWIPER_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load settings from IndexedDB (wait for store hydration)
  useEffect(() => {
    // Wait for store to hydrate before loading settings
    if (!isHydrated) {
      return;
    }

    if (!userId) {
      return;
    }

    let mounted = true;
    async function loadSettings() {
      try {
        const config = await getUIConfig(userId!);

        if (mounted) {
          const loadedSettings = {
            use24Hour: config.data.timeSwiper?.use24Hour ?? DEFAULT_TIME_SWIPER_SETTINGS.use24Hour,
            swipeSpeed: config.data.timeSwiper?.swipeSpeed ?? DEFAULT_TIME_SWIPER_SETTINGS.swipeSpeed,
            incrementMinutes: config.data.timeSwiper?.incrementMinutes ?? DEFAULT_TIME_SWIPER_SETTINGS.incrementMinutes,
            magneticFeel: config.data.timeSwiper?.magneticFeel ?? DEFAULT_TIME_SWIPER_SETTINGS.magneticFeel,
            showCurrentTime: config.data.timeSwiper?.showCurrentTime ?? DEFAULT_TIME_SWIPER_SETTINGS.showCurrentTime,
          };
          setSettings(loadedSettings);
          setSavedSettings(loadedSettings);
        }
      } catch (e) {
        console.error('[TimeSwiper] Failed to load settings:', e);
      }
    }
    loadSettings();
    return () => {
      mounted = false;
    };
  }, [isHydrated, userId]);

  // Update current time periodically for time markers
  useEffect(() => {
    // Update every 2 minutes (120000ms)
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  // Cleanup on unmount - stop animations and reset state
  useEffect(() => {
    return () => {
      // Stop any ongoing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // Reset dragging state
      isDraggingRef.current = false;
      velocityRef.current = 0;
    };
  }, []);

  // Check if settings have changed
  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  // Settings handlers for the panel
  const updateSetting = useCallback(<K extends keyof TimeSwiperSettingsState>(key: K, value: TimeSwiperSettingsState[K]) => {
    setSettings(s => ({ ...s, [key]: value }));
  }, []);

  const saveSetting = useCallback(<K extends keyof TimeSwiperSettingsState>(key: K, value: TimeSwiperSettingsState[K]) => {
    setSettings(s => ({ ...s, [key]: value }));
  }, []);

  // Save settings to IndexedDB (or just close if no changes)
  const handleSave = useCallback(async () => {
    // If no changes, just close
    if (!isDirty) {
      setSettingsOpen(false);
      return;
    }

    // If no userId, can't save to DB but still close
    if (!userId) {
      setSettingsOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await updateUIConfig(userId, { timeSwiper: settings });
      setSavedSettings(settings);
      setSettingsOpen(false);
    } catch (e) {
      console.error('[TimeSwiper] Failed to save settings:', e);
    } finally {
      setIsSaving(false);
    }
  }, [userId, settings, isDirty]);

  // Reset settings to saved values and close
  const handleCancel = useCallback(() => {
    setSettings(savedSettings);
    setSettingsOpen(false);
  }, [savedSettings]);

  // Track container width for proper centering
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateWidth = () => {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setContainerWidth(container.clientWidth);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Convert date to pixel offset
  const dateToOffset = useCallback((date: Date): number => {
    const minutes = date.getHours() * 60 + date.getMinutes();
    return (minutes / 60) * HOUR_WIDTH;
  }, []);

  // Convert pixel offset to date
  const offsetToDate = useCallback((pixelOffset: number, baseDate: Date): Date => {
    let normalizedOffset = pixelOffset % TOTAL_WIDTH;
    if (normalizedOffset < 0) {
      normalizedOffset += TOTAL_WIDTH;
    }

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
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
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

  // Ease-out cubic function for smooth deceleration
  const easeOutCubic = (t: number): number => {
    return 1 - (1 - t) ** 3;
  };

  // Store latest values in refs to avoid recreating animate function
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const magneticFeelRef = useRef(settings.magneticFeel);

  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
    magneticFeelRef.current = settings.magneticFeel;
  }, [onChange, value, settings.magneticFeel]);

  // Store the animation function in a ref to avoid circular dependency
  const animateLoopRef = useRef<(() => void) | undefined>(undefined);

  // Momentum animation loop with ease-in-out and max duration
  useEffect(() => {
    animateLoopRef.current = () => {
      const elapsed = performance.now() - animationStartTimeRef.current;
      const initialVelocity = initialVelocityRef.current;

      // Calculate duration based on initial velocity (faster = longer, but capped)
      const baseDuration = Math.min(
        Math.abs(initialVelocity) * (magneticFeelRef.current ? 30 : 50),
        MAX_ANIMATION_DURATION,
      );

      // For magnetic feel, use shorter duration
      const duration = magneticFeelRef.current ? Math.min(baseDuration, 800) : baseDuration;

      if (elapsed >= duration) {
        animationRef.current = null;
        const finalDate = offsetToDate(offsetRef.current, valueRef.current);
        onChangeRef.current(finalDate);
        return;
      }

      // Progress from 0 to 1
      const progress = elapsed / duration;

      // Use ease-out for smooth deceleration
      const easedProgress = easeOutCubic(progress);

      // Calculate current velocity based on eased progress (velocity decreases over time)
      const currentVelocityFactor = 1 - easedProgress;
      velocityRef.current = initialVelocity * currentVelocityFactor * 0.3;

      offsetRef.current += velocityRef.current;
      offsetRef.current = ((offsetRef.current % TOTAL_WIDTH) + TOTAL_WIDTH) % TOTAL_WIDTH;

      setOffset(offsetRef.current);

      // Update time during momentum animation
      const currentDate = offsetToDate(offsetRef.current, valueRef.current);
      onChangeRef.current(currentDate);

      animationRef.current = requestAnimationFrame(() => animateLoopRef.current?.());
    };
  }, [offsetToDate]);

  const startAnimation = useCallback(() => {
    if (animateLoopRef.current) {
      animationRef.current = requestAnimationFrame(animateLoopRef.current);
    }
  }, []);

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
    if (!isDraggingRef.current) {
      return;
    }

    const currentX = e.clientX;
    const currentTime = performance.now();
    const deltaX = (lastXRef.current - currentX) * settings.swipeSpeed;
    const deltaTime = currentTime - lastTimeRef.current;

    if (deltaTime > 0) {
      const instantVelocity = (deltaX / deltaTime) * 16;
      velocityRef.current = velocityRef.current * 0.6 + instantVelocity * 0.4;
    }

    offsetRef.current += deltaX;
    offsetRef.current = ((offsetRef.current % TOTAL_WIDTH) + TOTAL_WIDTH) % TOTAL_WIDTH;
    setOffset(offsetRef.current);

    // Update time during swipe
    const newDate = offsetToDate(offsetRef.current, valueRef.current);
    onChangeRef.current(newDate);

    lastXRef.current = currentX;
    lastTimeRef.current = currentTime;
  }, [settings.swipeSpeed, offsetToDate]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Store initial velocity for animation
    initialVelocityRef.current = velocityRef.current;
    animationStartTimeRef.current = performance.now();

    const minVelocity = magneticFeelRef.current ? 0.5 : 0.2;

    if (Math.abs(velocityRef.current) > minVelocity) {
      startAnimation();
    } else {
      const finalDate = offsetToDate(offsetRef.current, valueRef.current);
      onChangeRef.current(finalDate);
    }
  }, [startAnimation, offsetToDate]);

  // +/- time adjustment
  const adjustTime = useCallback((direction: 1 | -1) => {
    stopAnimation();
    const newDate = new Date(value);
    newDate.setMinutes(newDate.getMinutes() + (settings.incrementMinutes * direction));
    onChange(newDate);
  }, [onChange, stopAnimation, value, settings.incrementMinutes]);

  // Format time display
  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();

    if (settings.use24Hour) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  // Format hour label
  const formatHourLabel = (hour: number): string => {
    const h = hour % 24;

    if (settings.use24Hour) {
      return `${h.toString().padStart(2, '0')}`;
    }

    const ampm = h >= 12 ? 'pm' : 'am';
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

  const centerX = containerWidth / 2;
  const buttonsOnLeft = handMode === 'left';

  // Calculate current time position for "now" indicator
  const nowOffset = dateToOffset(currentTime);

  // Calculate height to match 3 stacked buttons (3 * 40px + 2 * 4px gap = 128px)
  const swiperHeight = 128;

  // Settings popover content
  const settingsPopoverContent = (
    <SettingsPopoverWrapper
      title="Time Picker Settings"
      onClose={() => setSettingsOpen(false)}
      onSave={handleSave}
      onCancel={handleCancel}
      isDirty={isDirty}
      isSaving={isSaving}
      handMode={handMode}
    >
      <TimeSwiperSettingsPanel
        settings={settings}
        updateSetting={updateSetting}
        saveSetting={saveSetting}
        compact
      />
    </SettingsPopoverWrapper>
  );

  return (
    <div className={cn('select-none', className)}>
      {/* Main Layout */}
      <div className="flex items-stretch gap-2">
        {/* Buttons - Left side */}
        {buttonsOnLeft && (
          <ButtonStack
            onIncrement={() => adjustTime(1)}
            onDecrement={() => adjustTime(-1)}
            position="left"
            settingsContent={settingsPopoverContent}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
          />
        )}

        {/* Timeline Swiper Container */}
        <div className="relative flex-1 overflow-visible pb-3">
          {/* Main swiper area with background */}
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-2xl border border-border/30 bg-muted/20"
            style={{ height: swiperHeight }}
          >
            {/* Time Display - Fixed, inside the background */}
            <div className="pointer-events-none absolute inset-x-0 top-4 z-10 text-center">
              <span className="text-3xl font-semibold tracking-tight">
                {formatTime(value)}
              </span>
            </div>

            {/* Touch Area */}
            <div
              className="absolute inset-0 touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ cursor: 'grab' }}
            >
              {/* Timeline Track - render 3 copies for seamless loop */}
              <div
                className="absolute bottom-0 flex"
                style={{
                  height: 55,
                  transform: `translateX(${centerX - offset - TOTAL_WIDTH}px)`,
                }}
              >
                {[0, 1, 2].map(copy => (
                  <div
                    key={copy}
                    className="relative"
                    style={{ width: TOTAL_WIDTH, height: 55 }}
                  >
                    {ticks.map((tick, i) => (
                      <div
                        key={i}
                        className="absolute bottom-0 flex flex-col items-center"
                        style={{ left: tick.position, transform: 'translateX(-50%)' }}
                      >
                        {/* Tick mark - aligned to bottom */}
                        <div
                          className={cn(
                            'w-px',
                            tick.isHour
                              ? 'h-4 bg-muted-foreground/60'
                              : 'h-2.5 bg-muted-foreground/40',
                          )}
                        />
                        {/* Hour label - above tick */}
                        {tick.label && (
                          <span
                            className="absolute text-xs font-medium text-muted-foreground/80"
                            style={{ bottom: 18 }}
                          >
                            {tick.label}
                          </span>
                        )}
                      </div>
                    ))}

                    {/* Current time indicators */}
                    {settings.showCurrentTime && (
                      <>
                        {/* -2hr marker */}
                        <div
                          className="pointer-events-none absolute bottom-0 flex flex-col items-center opacity-30"
                          style={{ left: nowOffset - (HOUR_WIDTH * 2), transform: 'translateX(-50%)' }}
                        >
                          <div className="absolute text-[10px] font-bold tracking-wider text-muted-foreground" style={{ bottom: 44 }}>
                            -2hr
                          </div>
                          <div className="absolute h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ bottom: 38 }} />
                          <div className="h-9 w-px bg-muted-foreground" />
                        </div>

                        {/* -1hr marker */}
                        <div
                          className="pointer-events-none absolute bottom-0 flex flex-col items-center opacity-30"
                          style={{ left: nowOffset - HOUR_WIDTH, transform: 'translateX(-50%)' }}
                        >
                          <div className="absolute text-[10px] font-bold tracking-wider text-primary" style={{ bottom: 44 }}>
                            -1hr
                          </div>
                          <div className="absolute h-1.5 w-1.5 rounded-full bg-primary" style={{ bottom: 38 }} />
                          <div className="h-9 w-px bg-primary" />
                        </div>

                        {/* NOW marker */}
                        <div
                          className="pointer-events-none absolute bottom-0 flex flex-col items-center opacity-60"
                          style={{ left: nowOffset, transform: 'translateX(-50%)' }}
                        >
                          <div className="absolute text-[10px] font-bold tracking-wider text-primary" style={{ bottom: 44 }}>
                            now
                          </div>
                          <div className="absolute h-1.5 w-1.5 rounded-full bg-primary" style={{ bottom: 38 }} />
                          <div className="h-9 w-px bg-primary" />
                        </div>

                        {/* +1hr marker */}
                        <div
                          className="pointer-events-none absolute bottom-0 flex flex-col items-center opacity-30"
                          style={{ left: nowOffset + HOUR_WIDTH, transform: 'translateX(-50%)' }}
                        >
                          <div className="absolute text-[10px] font-bold tracking-wider text-primary" style={{ bottom: 44 }}>
                            +1hr
                          </div>
                          <div className="absolute h-1.5 w-1.5 rounded-full bg-primary" style={{ bottom: 38 }} />
                          <div className="h-9 w-px bg-primary" />
                        </div>

                        {/* +2hr marker */}
                        <div
                          className="pointer-events-none absolute bottom-0 flex flex-col items-center opacity-30"
                          style={{ left: nowOffset + (HOUR_WIDTH * 2), transform: 'translateX(-50%)' }}
                        >
                          <div className="absolute text-[10px] font-bold tracking-wider text-muted-foreground" style={{ bottom: 44 }}>
                            +2hr
                          </div>
                          <div className="absolute h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ bottom: 38 }} />
                          <div className="h-9 w-px bg-muted-foreground" />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center Indicator - Triangle pointer extending below */}
          <div
            className="pointer-events-none absolute left-1/2 z-20 text-primary filter-[drop-shadow(0_2px_3px_rgba(0,0,0,0.3))_drop-shadow(0_1px_2px_rgba(0,0,0,0.2))] dark:filter-[drop-shadow(0_2px_3px_rgba(255,255,255,0.4))_drop-shadow(0_1px_2px_rgba(255,255,255,0.3))]"
            style={{
              bottom: 8,
              transform: 'translateX(-50%)',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="currentColor"
            >
              <path d="M7 0L14 14H0L7 0Z" />
            </svg>
          </div>
        </div>

        {/* Buttons - Right side */}
        {!buttonsOnLeft && (
          <ButtonStack
            onIncrement={() => adjustTime(1)}
            onDecrement={() => adjustTime(-1)}
            position="right"
            settingsContent={settingsPopoverContent}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
          />
        )}
      </div>
    </div>
  );
}
