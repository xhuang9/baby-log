'use client';

import type { NappyColour } from '@/lib/local-db';
import { FieldSection } from '@/components/input-controls';

type ColourButtonsProps = {
  value: NappyColour | null;
  onChange: (value: NappyColour | null) => void;
  handMode: 'left' | 'right';
};

const COLOURS: { value: NappyColour; label: string; hex: string }[] = [
  { value: 'green', label: 'Green', hex: '#4ade80' },
  { value: 'yellow', label: 'Yellow', hex: '#facc15' },
  { value: 'brown', label: 'Brown', hex: '#92400e' },
  { value: 'black', label: 'Black', hex: '#374151' },
  { value: 'red', label: 'Red', hex: '#ef4444' },
  { value: 'grey', label: 'Grey', hex: '#9ca3af' },
];

export function ColourButtons({ value, onChange, handMode }: ColourButtonsProps) {
  const handleClick = (colour: NappyColour) => {
    // Toggle behavior: if already selected, deselect it
    if (value === colour) {
      onChange(null);
    } else {
      onChange(colour);
    }
  };

  return (
    <FieldSection label="Colour" handMode={handMode}>
      <div className="grid w-fit grid-cols-3 gap-4 sm:flex sm:flex-wrap sm:justify-end">
        {COLOURS.map(colour => (
          <button
            key={colour.value}
            type="button"
            onClick={() => handleClick(colour.value)}
            className="group flex flex-col items-center gap-2"
            aria-label={colour.label}
            aria-pressed={value === colour.value}
          >
            <div
              className={`h-12 w-12 rounded-3xl transition-all ${
                value === colour.value
                  ? 'scale-110 ring-4 ring-primary ring-offset-2 ring-offset-background'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: colour.hex }}
            />
            <span
              className={`text-xs transition-colors ${
                value === colour.value
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {colour.label}
            </span>
          </button>
        ))}
      </div>
    </FieldSection>
  );
}
