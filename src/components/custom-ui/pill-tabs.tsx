'use client';

import type { VariantProps } from 'class-variance-authority';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const pillTabsListVariants = cva(
  'inline-flex items-center rounded-xl bg-muted p-[3px]',
  {
    variants: {
      size: {
        sm: 'h-8',
        default: 'h-9',
        lg: 'h-10',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

const pillTabsTriggerVariants = cva(
  'inline-flex items-center justify-center rounded-xl px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-[calc(100%-2px)] text-xs',
        default: 'h-[calc(100%-2px)]',
        lg: 'h-[calc(100%-2px)] text-base',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

type PillTabsProps = TabsPrimitive.Root.Props;

function PillTabs({ className, ...props }: PillTabsProps) {
  return (
    <TabsPrimitive.Root
      data-slot="pill-tabs"
      className={cn('', className)}
      {...props}
    />
  );
}

type PillTabsListProps = TabsPrimitive.List.Props
  & VariantProps<typeof pillTabsListVariants>;

function PillTabsList({ className, size, ...props }: PillTabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="pill-tabs-list"
      className={cn(pillTabsListVariants({ size }), className)}
      {...props}
    />
  );
}

type PillTabsTriggerProps = TabsPrimitive.Tab.Props
  & VariantProps<typeof pillTabsTriggerVariants>;

function PillTabsTrigger({ className, size, ...props }: PillTabsTriggerProps) {
  return (
    <TabsPrimitive.Tab
      data-slot="pill-tabs-trigger"
      className={cn(
        pillTabsTriggerVariants({ size }),
        'text-muted-foreground',
        'data-active:bg-primary data-active:text-primary-foreground',
        className,
      )}
      {...props}
    />
  );
}

export {
  PillTabs,
  PillTabsList,
  pillTabsListVariants,
  PillTabsTrigger,
  pillTabsTriggerVariants,
};
