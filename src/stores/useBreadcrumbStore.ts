import { useEffect } from 'react';
import { create } from 'zustand';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbStore = {
  breadcrumbs: BreadcrumbItem[];
  pageTitle: string | null;
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  setPageTitle: (title: string | null) => void;
};

export const useBreadcrumbStore = create<BreadcrumbStore>(set => ({
  breadcrumbs: [],
  pageTitle: null,
  setBreadcrumbs: breadcrumbs => set({ breadcrumbs }),
  setPageTitle: pageTitle => set({ pageTitle }),
}));

/**
 * Hook to set breadcrumbs for the current page.
 * Automatically cleans up when component unmounts.
 *
 * @example
 * ```tsx
 * useSetBreadcrumb([
 *   { label: 'Settings', href: '/settings' },
 *   { label: 'User Profile' }
 * ]);
 * ```
 */
export function useSetBreadcrumb(items: BreadcrumbItem[]) {
  const setBreadcrumbs = useBreadcrumbStore(state => state.setBreadcrumbs);

  useEffect(() => {
    setBreadcrumbs(items);

    return () => {
      setBreadcrumbs([]);
    };
  }, [items, setBreadcrumbs]);
}

/**
 * Hook to set page title when no breadcrumbs are provided.
 * Automatically cleans up when component unmounts.
 *
 * @example
 * ```tsx
 * useSetPageTitle('Overview');
 * ```
 */
export function useSetPageTitle(title: string) {
  const setPageTitle = useBreadcrumbStore(state => state.setPageTitle);

  useEffect(() => {
    setPageTitle(title);

    return () => {
      setPageTitle(null);
    };
  }, [title, setPageTitle]);
}
