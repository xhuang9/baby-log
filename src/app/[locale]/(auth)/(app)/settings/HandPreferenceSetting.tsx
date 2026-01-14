'use client';

import { useEffect, useState, useTransition } from 'react';
import { updateHandPreference } from '@/actions/userSettingsActions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getUIConfig, updateUIConfig } from '@/lib/local-db/helpers/ui-config';
import { useUserStore } from '@/stores/useUserStore';

type HandMode = 'left' | 'right';

export function HandPreferenceSetting() {
  const user = useUserStore(s => s.user);
  const [handMode, setHandMode] = useState<HandMode>('right');
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Load initial value from IndexedDB
  useEffect(() => {
    async function loadHandMode() {
      if (!user?.localId) {
        return;
      }

      try {
        const config = await getUIConfig(user.localId);
        setHandMode(config.handMode);
      } catch (error) {
        console.error('Failed to load hand mode from IndexedDB:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadHandMode();
  }, [user?.localId]);

  const handleChange = (value: HandMode | null) => {
    if (!user?.localId || !value) {
      return;
    }

    setHandMode(value);

    // Update IndexedDB immediately for local-first experience
    updateUIConfig(user.localId, { handMode: value }).catch((error) => {
      console.error('Failed to update IndexedDB:', error);
    });

    // Sync to server
    startTransition(async () => {
      const result = await updateHandPreference(value);
      if (!result.success) {
        console.error('Failed to sync hand preference to server:', result.error);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-background p-4">
        <div>
          <p className="text-sm font-medium">Hand Preference</p>
          <p className="text-xs text-muted-foreground">
            Choose your dominant hand for better button placement
          </p>
        </div>
        <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border bg-background p-4">
      <div>
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
