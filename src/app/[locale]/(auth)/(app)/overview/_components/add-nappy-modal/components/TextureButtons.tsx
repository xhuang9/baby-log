'use client';

import type { NappyTexture } from '@/lib/local-db';
import { BaseButton } from '@/components/base/BaseButton';
import { Label } from '@/components/ui/label';

type TextureButtonsProps = {
  value: NappyTexture | null;
  onChange: (value: NappyTexture | null) => void;
  handMode: 'left' | 'right';
};

const TEXTURES_ROW_1: { value: NappyTexture; label: string }[] = [
  { value: 'veryRunny', label: 'Very Runny' },
  { value: 'runny', label: 'Runny' },
  { value: 'mushy', label: 'Mushy' },
];

const TEXTURES_ROW_2: { value: NappyTexture; label: string }[] = [
  { value: 'mucusy', label: 'Mucusy' },
  { value: 'solid', label: 'Solid' },
  { value: 'littleBalls', label: 'Little Balls' },
];

export function TextureButtons({ value, onChange, handMode }: TextureButtonsProps) {
  const handleClick = (texture: NappyTexture) => {
    // Toggle behavior: if already selected, deselect it
    if (value === texture) {
      onChange(null);
    } else {
      onChange(texture);
    }
  };

  return (
    <div
      className={`${handMode === 'left' ? 'space-y-3' : 'flex items-start justify-between'}`}
    >
      <Label className="text-muted-foreground">Texture</Label>
      <div className={`flex flex-col gap-3 ${handMode === 'left' ? '' : 'ml-auto'}`}>
        {/* Row 1 */}
        <div className="flex flex-wrap justify-end gap-3">
          {TEXTURES_ROW_1.map(texture => (
            <BaseButton
              key={texture.value}
              variant={value === texture.value ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleClick(texture.value)}
            >
              {texture.label}
            </BaseButton>
          ))}
        </div>
        {/* Row 2 */}
        <div className="flex flex-wrap justify-end gap-3">
          {TEXTURES_ROW_2.map(texture => (
            <BaseButton
              key={texture.value}
              variant={value === texture.value ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleClick(texture.value)}
            >
              {texture.label}
            </BaseButton>
          ))}
        </div>
      </div>
    </div>
  );
}
