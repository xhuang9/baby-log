'use client';

import { AppHeader } from '@/components/navigation/AppHeader';
import { AppSidebar } from '@/components/navigation/AppSidebar';
import { MobileBottomBar } from '@/components/navigation/MobileBottomBar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

type AppShellProps = {
  children: React.ReactNode;
  locale: string;
};

export const AppShell = ({ children, locale }: AppShellProps) => {
  return (
    <SidebarProvider>
      <AppSidebar locale={locale} />
      <SidebarInset>
        <AppHeader locale={locale} />

        <main className="flex flex-1 flex-col gap-4 p-4 pb-24 md:pb-4">
          <div className="min-h-[100vh] flex-1 p-4">
            {children}
          </div>
        </main>
      </SidebarInset>

      <MobileBottomBar locale={locale} />
    </SidebarProvider>
  );
};
