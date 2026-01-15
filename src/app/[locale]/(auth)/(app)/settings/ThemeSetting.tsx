'use client';

import type { ThemeMode } from '@/lib/local-db/types/entities';
import { useEffect, useState, useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getUIConfig, updateUIConfig } from '@/lib/local-db/helpers/ui-config';
import { useUserStore } from '@/stores/useUserStore';

export function ThemeSetting() {
  const user = useUserStore(s => s.user);
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Load initial value from IndexedDB
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    async function loadTheme() {
      if (!user?.localId) {
        timeoutId = setTimeout(() => {
          if (mounted && !user?.localId) {
            setIsLoading(false);
          }
        }, 1000);
        return;
      }

      try {
        const config = await getUIConfig(user.localId);
        if (mounted) {
          setTheme(config.data.theme ?? 'system');
        }
      } catch (error) {
        console.error('Failed to load theme from IndexedDB:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadTheme();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [user?.localId]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  const handleChange = (value: ThemeMode | null) => {
    if (!value) {
      return;
    }

    setTheme(value);

    if (user?.localId) {
      updateUIConfig(user.localId, { theme: value }).catch((error) => {
        console.error('Failed to update IndexedDB:', error);
      });
    }

    startTransition(async () => {
      // Future: enqueue sync mutation to outbox
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-between">
        <div className="pr-4">
          <p className="text-sm font-medium">Theme</p>
          <p className="text-xs text-muted-foreground">
            Choose your color theme
          </p>
        </div>
        <div className="h-8 w-24 shrink-0 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="pr-4">
        <p className="text-sm font-medium">Theme</p>
        <p className="text-xs text-muted-foreground">
          Choose your color theme
        </p>
      </div>
      <Select
        value={theme}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="system">System</SelectItem>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
