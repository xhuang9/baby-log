import type { LucideIcon } from 'lucide-react';
import { Activity, BarChart3, Home, Settings } from 'lucide-react';

export type AppNavKey = 'dashboard' | 'activities' | 'analytics' | 'settings';

export type AppNavItem = {
  key: AppNavKey;
  label: string;
  href: string;
  icon: LucideIcon;
};

export const appNavItems: AppNavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    key: 'activities',
    label: 'Activities',
    href: '/activities',
    icon: Activity,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    key: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];
