'use client';

import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { appNavItems } from '@/config/app-nav';
import { AppConfig } from '@/utils/AppConfig';
import { getI18nPath } from '@/utils/Helpers';

type AppHeaderProps = {
  locale: string;
};

export const AppHeader = ({ locale }: AppHeaderProps) => {
  const pathname = usePathname();

  // Find the current page based on pathname
  const currentPage = appNavItems.find((item) => {
    const itemPath = getI18nPath(item.href, locale);
    return pathname === itemPath;
  });

  const pageTitle = currentPage ? currentPage.label : AppConfig.name;

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center px-4">
        {/* Mobile: Centered Title */}
        <div className="flex w-full items-center justify-center md:hidden">
          <h1 className="text-sm font-semibold">{pageTitle}</h1>
        </div>

        {/* Desktop: Breadcrumb */}
        <div className="hidden items-center gap-2 md:flex">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href={getI18nPath('/dashboard', locale)}>
                  {AppConfig.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {currentPage && (
                <>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{currentPage.label}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>
    </header>
  );
};
