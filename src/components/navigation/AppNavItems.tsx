import Link from 'next/link';
import { appNavItems } from '@/config/app-nav';
import { cn } from '@/libs/utils';
import { getI18nPath } from '@/utils/Helpers';

type AppNavItemsProps = {
  locale: string;
  variant: 'sidebar' | 'bottom';
};

export const AppNavItems = ({ locale, variant }: AppNavItemsProps) => {
  return (
    <>
      {appNavItems.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            key={item.key}
            href={getI18nPath(item.href, locale)}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-teal-50 hover:text-slate-900',
              variant === 'bottom'
              && 'flex-col gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-500 hover:bg-transparent hover:text-slate-900',
            )}
          >
            <Icon className={cn('size-4 text-slate-500 group-hover:text-teal-600', variant === 'bottom' && 'size-5')} />
            <span className={cn('tracking-wide', variant === 'bottom' && 'text-[10px] font-semibold uppercase')}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </>
  );
};
