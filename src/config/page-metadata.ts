import type { AppNavKey } from './app-nav';

export type PageMetadata = {
  key: AppNavKey;
  titleKey: string;
  namespace: string;
};

export const pageMetadata: Record<AppNavKey, PageMetadata> = {
  dashboard: {
    key: 'dashboard',
    titleKey: 'title',
    namespace: 'Dashboard',
  },
  activities: {
    key: 'activities',
    titleKey: 'title',
    namespace: 'Activities',
  },
  analytics: {
    key: 'analytics',
    titleKey: 'title',
    namespace: 'Analytics',
  },
  settings: {
    key: 'settings',
    titleKey: 'title',
    namespace: 'Settings',
  },
};
