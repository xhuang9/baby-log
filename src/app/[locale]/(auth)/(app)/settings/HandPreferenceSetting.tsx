'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { HandMode } from '@/lib/local-db/types/entities';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getUIConfig, updateUIConfig } from '@/lib/local-db/helpers/ui-config';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';

type HandPreferenceSettingProps = {
  isCompact?: boolean;
};

export function HandPreferenceSetting({ isCompact = false }: HandPreferenceSettingProps) {
  const user = useUserStore(s => s.user);
  const [handMode, setHandMode] = useState<HandMode>('right');
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Load initial value from IndexedDB
  useEffect(() => {
    let mounted = true;

    async function loadHandMode() {
      // If no user yet, wait for it but don't stay loading forever
      if (!user?.localId) {
        // Give it a moment then show default
        setTimeout(() => {
          if (mounted && !user?.localId) {
            setIsLoading(false);
          }
        }, 1000);
        return;
      }

      try {
        const config = await getUIConfig(user.localId);
        if (mounted) {
          setHandMode(config.data.handMode ?? 'right');
        }
      } catch (error) {
        console.error('Failed to load hand mode from IndexedDB:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadHandMode();

    return () => {
      mounted = false;
    };
  }, [user?.localId]);

  const handleChange = (value: HandMode | null) => {
    if (!value) {
      return;
    }

    setHandMode(value);

    // Update IndexedDB immediately for local-first experience
    if (user?.localId) {
      updateUIConfig(user.localId, { handMode: value })
        .then(() => {
          toast.success('Settings updated');
        })
        .catch((error) => {
          console.error('Failed to update IndexedDB:', error);
          toast.error('Failed to save settings');
        });
    }

    // TODO: Sync to server via outbox when API is ready
    // For now, we just update locally
    startTransition(async () => {
      // Future: enqueue sync mutation to outbox
    });
  };

  if (isLoading) {
    return (
      <div className={cn(
        'flex items-center justify-between',
        !isCompact && 'rounded-lg border bg-background p-4',
      )}
      >
        <div className="pr-4">
          <p className="text-sm font-medium">Hand Preference</p>
          <p className="text-xs text-muted-foreground">
            Choose your dominant hand for better button placement
          </p>
        </div>
        <div className="h-8 w-24 shrink-0 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center justify-between',
      !isCompact && 'rounded-lg border bg-background p-4',
    )}
    >
      <div className="pr-4">
        <p className="text-sm font-medium">Hand Preference</p>
        <p className="text-xs text-muted-foreground">
          Choose your dominant hand for better button placement
        </p>
      </div>
      <Select
        value={handMode}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="left">Left</SelectItem>
          <SelectItem value="right">Right</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
