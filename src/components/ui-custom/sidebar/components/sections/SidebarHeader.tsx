'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn('gap-2 p-2 flex flex-col', className)}
      {...props}
    />
  );
}
