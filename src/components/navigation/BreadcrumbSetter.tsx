'use client';

import type { BreadcrumbItem } from '@/components/providers/BreadcrumbProvider';
import { useSetBreadcrumb } from '@/components/providers/BreadcrumbProvider';

type BreadcrumbSetterProps = {
  items: BreadcrumbItem[];
};

/**
 * Client component that sets breadcrumbs in the breadcrumb context.
 * Use this in server component pages that can't be converted to client components.
 */
export function BreadcrumbSetter({ items }: BreadcrumbSetterProps) {
  useSetBreadcrumb(items);
  return null;
}
