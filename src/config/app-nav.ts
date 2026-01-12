import type { LucideIcon } from 'lucide-react';
import {
  LayoutGrid,
  LineChart,
  List,
  Sliders,
} from 'lucide-react';

export type AppNavKey = 'overview' | 'logs' | 'insights' | 'settings';

export type AppNavItem = {
  key: AppNavKey;
  label: string;
  href: string;
  icon: LucideIcon;
};

export const appNavItems: AppNavItem[] = [
  {
    key: 'overview',
    label: 'Overview',
    href: '/overview',
    icon: LayoutGrid,
  },
  {
    key: 'logs',
    label: 'Logs',
    href: '/logs',
    icon: List,
  },
  {
    key: 'insights',
    label: 'Insights',
    href: '/insights',
    icon: LineChart,
  },
  {
    key: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Sliders,
  },
];
