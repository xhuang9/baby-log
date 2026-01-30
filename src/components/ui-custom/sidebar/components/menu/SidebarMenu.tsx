'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn('gap-0 flex w-full min-w-0 flex-col', className)}
      {...props}
    />
  );
}
