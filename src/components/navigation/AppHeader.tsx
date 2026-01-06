'use client';

import { UserButton } from '@clerk/nextjs';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

const userProfileProps = {
  appearance: {
    elements: {
      cardBox: 'bg-card',
      card: 'bg-card',
      footer: 'bg-card',
    },
  },
};

export const AppHeader = () => {
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
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background">
      <div className="flex w-full items-center px-4">
        {/* Mobile Layout: Back Button | Title | User Button */}
        <div className="flex w-full items-center justify-between md:hidden">
          {/* Left: Back Button or Spacer */}
          {hasBreadcrumbs
            ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleMobileBack}
                  aria-label="返回"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )
            : (
                <div className="h-8 w-8 shrink-0" />
              )}

          {/* Center: Page Title */}
          {pageTitle && (
            <h1 className="truncate text-sm font-medium">{pageTitle}</h1>
          )}

          {/* Right: User Button */}
          <div className="flex shrink-0 items-center gap-2">
            <UserButton
              userProfileProps={userProfileProps}
            />
          </div>
        </div>

        {/* Desktop Layout: Breadcrumb | User Button */}
        <div className="hidden w-full items-center justify-between md:flex">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            {hasBreadcrumbs
              ? (
                  <Breadcrumb>
                    <BreadcrumbList>
                      {breadcrumbs.map((item, index) => {
                        const isLast = index === breadcrumbs.length - 1;

                        return (
                          <div key={`${item.label}-${index}`} className="contents">
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
                    <h1 className="text-sm font-medium">{pageTitle}</h1>
                  )
                : null}
          </div>

          {/* Right: Theme Toggle + User Button */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserButton
              userProfileProps={userProfileProps}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
