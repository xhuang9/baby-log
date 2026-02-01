'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FoodInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function FoodInput({ value, onChange }: FoodInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="food-input">Food</Label>
      <Input
        id="food-input"
        type="text"
        placeholder="Enter food name (e.g., Apple, Carrot, Rice)"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-base"
        autoComplete="off"
      />
    </div>
  );
}
