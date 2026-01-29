'use client';

import type { NappyColour } from '@/lib/local-db';
import { Label } from '@/components/ui/label';

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
    <div
      className={`${handMode === 'left' ? 'space-y-3' : 'flex items-center justify-between'}`}
    >
      <Label className="text-muted-foreground">Colour</Label>
      <div className={`flex flex-wrap justify-end gap-3 ${handMode === 'left' ? '' : 'ml-auto'}`}>
        {COLOURS.map(colour => (
          <button
            key={colour.value}
            type="button"
            onClick={() => handleClick(colour.value)}
            className={`flex flex-col items-center gap-1.5 transition-opacity ${
              value && value !== colour.value ? 'opacity-40' : 'opacity-100'
            }`}
            aria-label={colour.label}
            aria-pressed={value === colour.value}
          >
            <div
              className={`h-8 w-8 rounded-full border-2 transition-all ${
                value === colour.value
                  ? 'border-primary scale-110'
                  : 'border-border'
              }`}
              style={{ backgroundColor: colour.hex }}
            />
            <span className="text-xs text-muted-foreground">{colour.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
