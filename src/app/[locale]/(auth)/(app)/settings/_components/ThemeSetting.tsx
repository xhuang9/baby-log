'use client';

import { useTheme } from 'next-themes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ThemeSetting() {
  const { theme, setTheme } = useTheme();

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
        onValueChange={value => value && setTheme(value)}
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
