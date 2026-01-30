'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn('text-sm w-full', className)}
      {...props}
    />
  );
}
