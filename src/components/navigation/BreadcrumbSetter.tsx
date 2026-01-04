'use client';

import type { BreadcrumbItem } from '@/stores/useBreadcrumbStore';
import { useSetBreadcrumb } from '@/stores/useBreadcrumbStore';

type BreadcrumbSetterProps = {
  items: BreadcrumbItem[];
};

/**
 * Client component that sets breadcrumbs in the breadcrumb store.
 * Use this in server component pages that can't be converted to client components.
 */
export function BreadcrumbSetter({ items }: BreadcrumbSetterProps) {
  useSetBreadcrumb(items);
  return null;
}
