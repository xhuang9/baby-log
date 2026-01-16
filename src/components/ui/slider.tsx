'use client';

import { DirectionProvider } from '@base-ui/react/direction-provider';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import * as React from 'react';
import { cn } from '@/lib/utils';

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  reversed = false,
  ...props
}: SliderPrimitive.Root.Props & { reversed?: boolean }) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min],
    [value, defaultValue, min],
  );

  const dir = reversed ? 'rtl' : 'ltr';

  return (
    <div dir={dir}>
      <DirectionProvider direction={dir}>
        <SliderPrimitive.Root
          className="data-horizontal:w-full data-vertical:h-full"
          data-slot="slider"
          defaultValue={defaultValue}
          value={value}
          min={min}
          max={max}
          thumbAlignment="edge"
          {...props}
        >
          <SliderPrimitive.Control
            className={cn(
              'data-vertical:min-h-40 relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:w-auto data-vertical:flex-col py-2',
              className,
            )}
          >
            <SliderPrimitive.Track
              data-slot="slider-track"
              className="relative overflow-hidden rounded-full bg-muted select-none data-horizontal:h-2 data-horizontal:w-full data-vertical:h-full data-vertical:w-2"
            >
              <SliderPrimitive.Indicator
                data-slot="slider-range"
                className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
              />
            </SliderPrimitive.Track>

            {Array.from({ length: _values.length }, (_, index) => (
              <SliderPrimitive.Thumb
                data-slot="slider-thumb"
                key={index}
                className="relative block size-5 shrink-0 rounded-full border-2 border-primary bg-white shadow-md transition-[color,box-shadow] select-none after:absolute after:-inset-3 hover:ring-4 hover:ring-primary/20 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-hidden active:ring-4 active:ring-primary/30 disabled:pointer-events-none disabled:opacity-50"
              />
            ))}
          </SliderPrimitive.Control>
        </SliderPrimitive.Root>
      </DirectionProvider>
    </div>
  );
}

export { Slider };
