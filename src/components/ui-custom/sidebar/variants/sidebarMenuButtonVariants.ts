import { cva } from 'class-variance-authority';

export const sidebarMenuButtonVariants = cva(
  'peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding,background-color,color] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-white/[0.02] hover:text-sidebar-primary focus-visible:ring-2 active:bg-white/[0.02] active:text-sidebar-primary disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:hover:bg-white/[0.02] dark:active:bg-white/[0.02] data-open:hover:bg-white/[0.02] data-open:hover:text-sidebar-primary dark:data-open:hover:bg-white/[0.02] data-active:bg-white/[0.05] data-active:font-medium data-active:text-sidebar-primary dark:data-active:bg-white/[0.05] [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate',
  {
    variants: {
      variant: {
        default: 'hover:bg-white/[0.02] hover:text-sidebar-primary dark:hover:bg-white/[0.02]',
        outline: 'bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-white/[0.02] hover:text-sidebar-primary hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))] dark:hover:bg-white/[0.02]',
      },
      size: {
        default: 'h-8 text-sm',
        sm: 'h-7 text-xs',
        lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
