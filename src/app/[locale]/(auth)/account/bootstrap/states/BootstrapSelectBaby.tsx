'use client';

import type { ActiveBaby } from '@/stores/useBabyStore';
import { Baby, Check } from 'lucide-react';
import { useState } from 'react';

type BootstrapSelectBabyProps = {
  babies: ActiveBaby[];
  onSelect: (baby: ActiveBaby) => void;
};

export function BootstrapSelectBaby(props: BootstrapSelectBabyProps) {
  const { babies, onSelect } = props;

  const [selectedId, setSelectedId] = useState<number | null>(babies[0]?.babyId ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedId) {
      return;
    }

    const selectedBaby = babies.find(b => b.babyId === selectedId);
    if (!selectedBaby) {
      return;
    }

    setIsSubmitting(true);
    onSelect(selectedBaby);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Select a Baby</h1>
        <p className="text-sm text-muted-foreground">
          Choose which baby you'd like to track
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          {babies.map(baby => (
            <button
              key={baby.babyId}
              type="button"
              onClick={() => setSelectedId(baby.babyId)}
              className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                selectedId === baby.babyId
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Baby className="h-5 w-5 text-primary" />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{baby.name}</h3>
                    {selectedId === baby.babyId && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      {baby.accessLevel}
                    </span>
                    {baby.caregiverLabel && (
                      <span>
                        Your role:
                        {baby.caregiverLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !selectedId}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        >
          {isSubmitting ? 'Switching...' : 'Continue to Overview'}
        </button>
      </form>
    </div>
  );
}
