'use client';

import type { NappyConsistency } from '@/lib/local-db';
import { CONSISTENCY_ICONS } from '@/components/icons/nappy';
import { FieldSection } from '@/components/input-controls';

type ConsistencyButtonsProps = {
  value: NappyConsistency | null;
  onChange: (value: NappyConsistency | null) => void;
  handMode: 'left' | 'right';
};

const CONSISTENCIES: { value: NappyConsistency; label: string }[] = [
  { value: 'watery', label: 'Watery' },
  { value: 'runny', label: 'Runny' },
  { value: 'mushy', label: 'Mushy' },
  { value: 'pasty', label: 'Pasty / Sticky' },
  { value: 'formed', label: 'Formed' },
  { value: 'hardPellets', label: 'Hard pellets' },
];

export function ConsistencyButtons({ value, onChange, handMode }: ConsistencyButtonsProps) {
  const handleClick = (consistency: NappyConsistency) => {
    // Toggle behavior: if already selected, deselect it
    if (value === consistency) {
      onChange(null);
    } else {
      onChange(consistency);
    }
  };

  return (
    <FieldSection label="Consistency" handMode={handMode}>
      <div className="grid w-fit grid-cols-2 gap-3 sm:grid-cols-3">
        {CONSISTENCIES.map((consistency) => {
          const Icon = CONSISTENCY_ICONS[consistency.value];
          const isSelected = value === consistency.value;
          return (
            <button
              key={consistency.value}
              type="button"
              onClick={() => handleClick(consistency.value)}
              className={`flex min-w-[100px] flex-col items-center justify-center gap-2 rounded-xl px-4 py-3 transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
              }`}
              aria-pressed={isSelected}
            >
              <Icon className="h-5 w-5" />
              <span className="text-center text-xs leading-tight font-medium">
                {consistency.label}
              </span>
            </button>
          );
        })}
      </div>
    </FieldSection>
  );
}
