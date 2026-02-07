'use client';

import type { LocalMedicationType } from '@/lib/local-db/types/medication-types';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MedicationPillsProps = {
  medicationTypes: LocalMedicationType[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  handMode?: 'left' | 'right';
};

export function MedicationPills({
  medicationTypes,
  selectedId,
  onSelect,
  onDelete,
  handMode = 'right',
}: MedicationPillsProps) {
  if (medicationTypes.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-wrap gap-2',
        handMode === 'left' ? 'justify-start' : 'justify-end',
      )}
    >
      {medicationTypes.map((medicationType) => {
        const isSelected = selectedId === medicationType.id;
        return (
          <div key={medicationType.id} className="group relative">
            <Button
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelect(medicationType.id)}
              className={cn(
                'flex items-center gap-1.5 pr-8',
                isSelected && 'bg-primary text-primary-foreground',
              )}
            >
              {isSelected && <Check className="h-3 w-3" />}
              <span>{medicationType.name}</span>
            </Button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(medicationType.id);
              }}
              className={cn(
                'absolute right-1 top-1/2 -translate-y-1/2',
                'opacity-0 group-hover:opacity-100 transition-opacity',
                'p-0.5 rounded-full hover:bg-destructive/10',
              )}
              aria-label={`Delete ${medicationType.name}`}
            >
              <X className="h-3 w-3 text-destructive" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
