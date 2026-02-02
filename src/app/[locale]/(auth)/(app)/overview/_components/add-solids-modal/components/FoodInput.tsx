'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FoodInputProps = {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  disabled?: boolean;
};

export function FoodInput({ value, onChange, onAdd, disabled }: FoodInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAdd();
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="food-input">Food</Label>
      <div className="flex gap-2">
        <Input
          id="food-input"
          type="text"
          placeholder="Type food name (e.g., Apple, Carrot)"
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
