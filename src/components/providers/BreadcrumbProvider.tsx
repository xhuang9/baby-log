'use client';

import type React from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbContextType = {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  pageTitle: string | null;
  setPageTitle: (title: string | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [pageTitle, setPageTitle] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      breadcrumbs,
      setBreadcrumbs,
      pageTitle,
      setPageTitle,
    }),
    [breadcrumbs, pageTitle],
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumb must be used within BreadcrumbProvider');
  }
  return context;
}

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
  const { setBreadcrumbs } = useBreadcrumb();

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
 * useSetPageTitle('Dashboard');
 * ```
 */
export function useSetPageTitle(title: string) {
  const { setPageTitle } = useBreadcrumb();

  useEffect(() => {
    setPageTitle(title);

    return () => {
      setPageTitle(null);
    };
  }, [title, setPageTitle]);
}
