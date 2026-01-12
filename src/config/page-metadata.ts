import type { AppNavKey } from './app-nav';

export type PageMetadata = {
  key: AppNavKey;
  titleKey: string;
  namespace: string;
};

export const pageMetadata: Record<AppNavKey, PageMetadata> = {
  overview: {
    key: 'overview',
    titleKey: 'title',
    namespace: 'Overview',
  },
  logs: {
    key: 'logs',
    titleKey: 'title',
    namespace: 'Logs',
  },
  insights: {
    key: 'insights',
    titleKey: 'title',
    namespace: 'Insights',
  },
  settings: {
    key: 'settings',
    titleKey: 'title',
    namespace: 'Settings',
  },
};
