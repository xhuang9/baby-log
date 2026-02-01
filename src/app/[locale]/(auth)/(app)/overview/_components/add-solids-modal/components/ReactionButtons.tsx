'use client';

import type { SolidsReaction } from '@/lib/local-db';
import { AlertTriangle, Frown, Heart, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type ReactionButtonsProps = {
  value: SolidsReaction;
  onChange: (value: SolidsReaction) => void;
  handMode?: 'left' | 'right';
};

const REACTIONS: { value: SolidsReaction; label: string; icon: typeof Heart }[] = [
  { value: 'allergic', label: 'Allergic', icon: AlertTriangle },
  { value: 'hate', label: 'Hate', icon: Frown },
  { value: 'liked', label: 'Liked', icon: Smile },
  { value: 'loved', label: 'Loved', icon: Heart },
];

export function ReactionButtons({ value, onChange, handMode = 'right' }: ReactionButtonsProps) {
  return (
    <div className="space-y-2">
      <Label>Reaction</Label>
      <div
        className={cn(
          'flex flex-wrap gap-2',
          handMode === 'left' ? 'justify-start' : 'justify-end',
        )}
      >
        {REACTIONS.map((reaction) => {
          const Icon = reaction.icon;
          const isSelected = value === reaction.value;
          return (
            <Button
              key={reaction.value}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              onClick={() => onChange(reaction.value)}
              className={cn(
                'flex items-center gap-2',
                isSelected && 'ring-2 ring-primary ring-offset-2',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{reaction.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
