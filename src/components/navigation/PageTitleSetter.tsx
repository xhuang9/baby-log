'use client';

import { useSetPageTitle } from '@/stores/useBreadcrumbStore';

type PageTitleSetterProps = {
  title: string;
};

/**
 * Client component that sets the page title in the breadcrumb store.
 * Use this in server component pages that can't be converted to client components.
 */
export function PageTitleSetter({ title }: PageTitleSetterProps) {
  useSetPageTitle(title);
  return null;
}
