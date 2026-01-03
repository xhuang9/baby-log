'use client';

import { AppHeader } from '@/components/navigation/AppHeader';
import { AppSidebar } from '@/components/navigation/AppSidebar';
import { MobileBottomBar } from '@/components/navigation/MobileBottomBar';
import { BreadcrumbProvider } from '@/components/providers/BreadcrumbProvider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

type AppShellProps = {
  children: React.ReactNode;
  locale: string;
  variant?: 'default' | 'unwrapped';
};

export const AppShell = ({ children, locale, variant = 'default' }: AppShellProps) => {
  return (
    <BreadcrumbProvider>
      <SidebarProvider>
        <AppSidebar locale={locale} />
        <SidebarInset>
          <AppHeader />

          <main className="flex flex-1 flex-col gap-4 p-4 md:pb-4 bg-background border-l">
            {variant === 'unwrapped' ? (
              children
            ) : (
              <div className="flex-1 rounded-xl border bg-background-muted p-4 md:p-8">
                {children}
              </div>
            )}
          </main>
        </SidebarInset>

        <MobileBottomBar locale={locale} />
      </SidebarProvider>
    </BreadcrumbProvider>
  );
};
