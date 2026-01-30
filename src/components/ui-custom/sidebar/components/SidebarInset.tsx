'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        'md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:shadow-sm md:peer-data-[state=expanded]:max-w-[calc(100vw-15rem)] relative flex w-full flex-1 flex-col h-dvh overflow-hidden',
        className,
      )}
      {...props}
    />
  );
}
