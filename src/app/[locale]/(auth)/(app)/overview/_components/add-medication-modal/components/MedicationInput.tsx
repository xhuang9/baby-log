'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type MedicationInputProps = {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  disabled?: boolean;
  handMode?: 'left' | 'right';
};

export function MedicationInput({ value, onChange, onAdd, disabled, handMode = 'right' }: MedicationInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAdd();
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="medication-input">Medication</Label>
      <div className={`flex gap-2 ${handMode === 'left' ? 'flex-row-reverse' : 'flex-row'}`}>
        <Input
          id="medication-input"
          type="text"
          placeholder="Type medication name (e.g., Tylenol, Vitamin D)"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 text-base"
          autoComplete="off"
          disabled={disabled}
        />
        <Button
          type="button"
          onClick={onAdd}
          disabled={!value.trim() || disabled}
          size="icon"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
