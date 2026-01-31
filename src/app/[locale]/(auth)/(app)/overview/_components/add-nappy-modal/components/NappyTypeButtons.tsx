'use client';

import type { NappyType } from '@/lib/local-db';
import { FieldSection } from '@/components/input-controls';

type NappyTypeButtonsProps = {
  value: NappyType;
  onChange: (value: NappyType) => void;
  handMode: 'left' | 'right';
};

const NAPPY_TYPES: { value: NappyType; label: string }[] = [
  { value: 'wee', label: 'Wee' },
  { value: 'poo', label: 'Poo' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'clean', label: 'Clean' },
];

export function NappyTypeButtons({ value, onChange, handMode }: NappyTypeButtonsProps) {
  return (
    <FieldSection label="Type" handMode={handMode}>
      <div className="flex flex-wrap justify-end gap-3">
        {NAPPY_TYPES.map((type) => {
          const isSelected = value === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange(type.value)}
              className={`rounded-xl px-6 py-3 font-medium transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {type.label}
            </button>
          );
        })}
      </div>
    </FieldSection>
  );
}
