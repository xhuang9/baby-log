'use client';

import { usePathname } from 'next/navigation';
import { OfflineLink as Link } from '@/components/ui/offline-link';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { appNavItems } from '@/config/app-nav';
import { getI18nPath } from '@/utils/Helpers';
import { BabySwitcher } from './BabySwitcher';

type AppSidebarProps = {
  locale: string;
};

export const AppSidebar = ({ locale, ...props }: AppSidebarProps & React.ComponentProps<typeof Sidebar>) => {
  const pathname = usePathname();

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <BabySwitcher locale={locale} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="gap-1">
          {appNavItems.map((item) => {
            const Icon = item.icon;
            const href = getI18nPath(item.href, locale);
            const isActive = pathname === href;

            return (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton
                  isActive={isActive}
                  render={props => (
                    <Link href={href} {...props}>
                      <Icon />
                      <span>{item.label}</span>
                    </Link>
                  )}
                />
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="rounded-lg border bg-muted/50 p-3 text-xs group-data-[collapsible=icon]:hidden">
          <p className="font-semibold">Tips</p>
          <p className="mt-1 text-muted-foreground">
            Track daily sessions and review insights weekly.
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
