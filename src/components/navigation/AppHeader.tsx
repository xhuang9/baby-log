'use client';

import { ChevronLeft, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { OfflineLink as Link } from '@/components/ui/offline-link';
import { useBreadcrumbStore } from '@/stores/useBreadcrumbStore';
import { ThemeToggle } from '../theme-toggle';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';
import { Button } from '../ui/button';
import { SidebarTrigger } from '../ui/sidebar';
import { BabySwitcher } from './BabySwitcher';
import { NotificationBell } from './NotificationBell';

type AppHeaderProps = {
  locale: string;
};

export const AppHeader = ({ locale }: AppHeaderProps) => {
  const router = useRouter();
  const breadcrumbs = useBreadcrumbStore(state => state.breadcrumbs);
  const pageTitle = useBreadcrumbStore(state => state.pageTitle);
  const hasBreadcrumbs = breadcrumbs.length > 0;

  // Mobile back button logic
  const handleMobileBack = () => {
    if (breadcrumbs.length > 1) {
      // Multiple levels: navigate to parent (first breadcrumb)
      const parentHref = breadcrumbs[0]?.href;
      if (parentHref) {
        router.push(parentHref);
      }
    } else {
      // Single level or no breadcrumbs: browser back
      router.back();
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-16 md:h-14">
      <div className="flex w-full items-center px-5">
        {/* Mobile Layout: Back Button | Title | Settings Button */}
        <div className="relative flex w-full items-center justify-between md:hidden">
          {/* Left: Back Button or Baby Dropdown */}
          <div className="z-10 flex-1">
            {hasBreadcrumbs
              ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={handleMobileBack}
                    aria-label="back to previous page"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )
              : (
                  <div className="shrink-0">
                    <BabySwitcher locale={locale} />
                  </div>
                )}
          </div>

          {/* Center: Page Title (Absolutely Centered) */}
          {pageTitle && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <h1 className="truncate text-base font-semibold whitespace-nowrap">{pageTitle}</h1>
            </div>
          )}

          {/* Right: Settings Button */}
          <div className="z-10 flex flex-1 shrink-0 items-center justify-end gap-2">
            <Link href="/settings">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                aria-label="Go to settings"
              >
                <Settings className="size-6" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Desktop Layout: Breadcrumb | Settings Button */}
        <div className="hidden w-full items-center justify-between md:flex">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            {hasBreadcrumbs
              ? (
                  <Breadcrumb>
                    <BreadcrumbList className="text-[15px]">
                      {breadcrumbs.map((item, index) => {
                        const isLast = index === breadcrumbs.length - 1;
                        const breadcrumbKey = item.href ? `${item.href}-${item.label}` : item.label;

                        return (
                          <div key={breadcrumbKey} className="contents">
                            <BreadcrumbItem>
                              {isLast
                                ? (
                                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                                  )
                                : item.href
                                  ? (
                                      <BreadcrumbLink render={props => (
                                        <Link href={item.href!} {...props}>
                                          {item.label}
                                        </Link>
                                      )}
                                      />
                                    )
                                  : (
                                      <span>{item.label}</span>
                                    )}
                            </BreadcrumbItem>
                            {!isLast && <BreadcrumbSeparator />}
                          </div>
                        );
                      })}
                    </BreadcrumbList>
                  </Breadcrumb>
                )
              : pageTitle
                ? (
                    <h1 className="text-[15px] font-medium">{pageTitle}</h1>
                  )
                : null}
          </div>

          {/* Right: Bell + Theme Toggle + Settings Button */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
            <Link href="/settings">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Go to settings"
              >
                <Settings className="size-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
