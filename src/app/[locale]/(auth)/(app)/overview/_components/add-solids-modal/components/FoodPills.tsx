'use client';

import type { LocalFoodType } from '@/lib/local-db/types/food-types';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FoodPillsProps = {
  foodTypes: LocalFoodType[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  handMode?: 'left' | 'right';
};

export function FoodPills({
  foodTypes,
  selectedIds,
  onToggle,
  onDelete,
  handMode = 'right',
}: FoodPillsProps) {
  if (foodTypes.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-wrap gap-2',
        handMode === 'left' ? 'justify-start' : 'justify-end',
      )}
    >
      {foodTypes.map((foodType) => {
        const isSelected = selectedIds.includes(foodType.id);
        return (
          <div key={foodType.id} className="relative group">
            <Button
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle(foodType.id)}
              className={cn(
                'flex items-center gap-1.5 pr-8',
                isSelected && 'bg-primary text-primary-foreground',
              )}
            >
              {isSelected && <Check className="h-3 w-3" />}
              <span>{foodType.name}</span>
            </Button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(foodType.id);
              }}
              className={cn(
                'absolute right-1 top-1/2 -translate-y-1/2',
                'opacity-0 group-hover:opacity-100 transition-opacity',
                'p-0.5 rounded-full hover:bg-destructive/10',
              )}
              aria-label={`Delete ${foodType.name}`}
            >
              <X className="h-3 w-3 text-destructive" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
