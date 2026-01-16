'use client';

import { AppHeader } from '@/components/navigation/AppHeader';
import { AppSidebar } from '@/components/navigation/AppSidebar';
import { MobileBottomBar } from '@/components/navigation/MobileBottomBar';
import { DatabaseHealthCheck } from '@/components/DatabaseHealthCheck';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SyncProvider } from '@/components/SyncProvider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

type AppShellProps = {
  children: React.ReactNode;
  locale: string;
  variant?: 'default' | 'unwrapped';
};

export const AppShell = ({ children, locale, variant = 'default' }: AppShellProps) => {
  return (
    <SyncProvider>
      <SidebarProvider>
        <DatabaseHealthCheck />
        <OfflineBanner />
        <AppSidebar locale={locale} />
        <SidebarInset>
          <AppHeader />

          <main className="flex flex-1 flex-col gap-4 overflow-auto bg-background p-4 md:pb-4">
            {variant === 'unwrapped'
              ? (
                  children
                )
              : (
                  <div className="flex-1 rounded-xl border bg-sidebar p-4 md:p-8">
                    {children}
                  </div>
                )}
          </main>
        </SidebarInset>

        <MobileBottomBar locale={locale} />
      </SidebarProvider>
    </SyncProvider>
  );
};
