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

type ReactionConfig = {
  value: SolidsReaction;
  label: string;
  icon: typeof Heart;
  bgSelected: string;
  textSelected: string;
  iconColor: string;
};

const REACTIONS: ReactionConfig[] = [
  {
    value: 'allergic',
    label: 'Allergic',
    icon: AlertTriangle,
    bgSelected: 'bg-red-500',
    textSelected: 'text-white',
    iconColor: 'text-red-500',
  },
  {
    value: 'hate',
    label: 'Hate',
    icon: Frown,
    bgSelected: 'bg-orange-500',
    textSelected: 'text-white',
    iconColor: 'text-orange-500',
  },
  {
    value: 'liked',
    label: 'Liked',
    icon: Smile,
    bgSelected: 'bg-green-500',
    textSelected: 'text-white',
    iconColor: 'text-green-500',
  },
  {
    value: 'loved',
    label: 'Loved',
    icon: Heart,
    bgSelected: 'bg-pink-500',
    textSelected: 'text-white',
    iconColor: 'text-pink-500',
  },
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
                isSelected && [
                  reaction.bgSelected,
                  reaction.textSelected,
                  'hover:opacity-90',
                ],
              )}
            >
              <Icon className={cn('h-4 w-4', !isSelected && reaction.iconColor)} fill="currentColor" />
              <span>{reaction.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
