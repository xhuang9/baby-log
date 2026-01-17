'use client';

import { usePathname } from 'next/navigation';
import { OfflineLink as Link } from '@/components/ui/offline-link';
import { appNavItems } from '@/config/app-nav';
import { cn } from '@/lib/utils';
import { getI18nPath } from '@/utils/Helpers';

type AppNavItemsProps = {
  locale: string;
  variant: 'sidebar' | 'bottom';
};

export const AppNavItems = ({ locale, variant }: AppNavItemsProps) => {
  const pathname = usePathname();

  return (
    <>
      {appNavItems.map((item) => {
        const Icon = item.icon;
        const itemPath = getI18nPath(item.href, locale);
        const isActive = pathname === itemPath || pathname.startsWith(`${itemPath}/`);

        return (
          <Link
            key={item.key}
            href={itemPath}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              'text-muted-foreground hover:bg-accent/10 hover:text-foreground',
              isActive && 'bg-accent/10 text-foreground',
              variant === 'bottom'
              && 'flex-col gap-1 rounded-lg px-2 py-1 text-[11px] hover:bg-transparent',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              className={cn(
                'size-4 transition-colors',
                'text-muted-foreground group-hover:text-primary',
                isActive && 'text-primary',
                variant === 'bottom' && 'size-5',
              )}
            />
            <span className={cn('tracking-wide', variant === 'bottom' && 'text-[10px] font-semibold uppercase')}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </>
  );
};
