'use client';

import { AppHeader } from '@/components/navigation/AppHeader';
import { AppSidebar } from '@/components/navigation/AppSidebar';
import { MobileBottomBar } from '@/components/navigation/MobileBottomBar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

type AppShellProps = {
  children: React.ReactNode;
  locale: string;
  variant?: 'default' | 'unwrapped';
};

export const AppShell = ({ children, locale, variant = 'default' }: AppShellProps) => {
  return (
    <SidebarProvider>
      <AppSidebar locale={locale} />
      <SidebarInset>
        <AppHeader />

        <main className="flex flex-1 flex-col gap-4 bg-background p-4 md:pb-4 max-w-auto lg:max-w-[calc(100vw-15rem)] overflow-auto">
          {variant === 'unwrapped'
            ? (
                children
              )
            : (
                <div className="bg-background-muted flex-1 rounded-xl border p-4 md:p-8">
                  {children}
                </div>
              )}
        </main>
      </SidebarInset>

      <MobileBottomBar locale={locale} />
    </SidebarProvider>
  );
};
