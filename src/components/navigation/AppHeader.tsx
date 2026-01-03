'use client';

import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { useBreadcrumb } from '../providers/BreadcrumbProvider';
import { ThemeToggle } from '../theme-toggle';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';
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
  const { breadcrumbs, pageTitle } = useBreadcrumb();
  const hasBreadcrumbs = breadcrumbs.length > 0;

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-l">
      <div className="flex w-full items-center px-4">
        {/* Mobile Layout: Back Button | Title | User Button */}
        <div className="flex w-full items-center justify-end sm:justify-between md:hidden">
          <SidebarTrigger className="hidden sm:block" />

          {/* Right: Theme Toggle + User Button */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserButton
              userProfileProps={userProfileProps}
            />
          </div>
        </div>

        {/* Desktop Layout: Breadcrumb | User Button */}
        <div className="hidden w-full items-center justify-between md:flex">
          <div className="flex items-center gap-2">
            <SidebarTrigger />

            {hasBreadcrumbs ? (
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((item, index) => {
                    const isLast = index === breadcrumbs.length - 1;

                    return (
                      <div key={index} className="contents">
                        <BreadcrumbItem>
                          {isLast ? (
                            <BreadcrumbPage>{item.label}</BreadcrumbPage>
                          ) : item.href ? (
                            <BreadcrumbLink render={props => (
                              <Link href={item.href!} {...props}>
                                {item.label}
                              </Link>
                            )} />
                          ) : (
                            <span>{item.label}</span>
                          )}
                        </BreadcrumbItem>
                        {!isLast && <BreadcrumbSeparator />}
                      </div>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            ) : pageTitle ? (
              <span className="text-sm font-medium">{pageTitle}</span>
            ) : null}
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
