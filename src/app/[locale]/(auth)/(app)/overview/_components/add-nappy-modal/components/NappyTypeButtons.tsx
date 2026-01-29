'use client';

import type { NappyType } from '@/lib/local-db';
import { BaseButton } from '@/components/base/BaseButton';
import { Label } from '@/components/ui/label';

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
    <div
      className={`${handMode === 'left' ? 'space-y-3' : 'flex items-center justify-between'}`}
    >
      <Label className="text-muted-foreground">Type</Label>
      <div className={`flex flex-wrap justify-end gap-3 ${handMode === 'left' ? '' : 'ml-auto'}`}>
        {NAPPY_TYPES.map(type => (
          <BaseButton
            key={type.value}
            variant={value === type.value ? 'primary' : 'secondary'}
            onClick={() => onChange(type.value)}
          >
            {type.label}
          </BaseButton>
        ))}
      </div>
    </div>
  );
}
