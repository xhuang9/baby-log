'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import { AppConfig } from '@/utils/AppConfig';
import { getI18nPath } from '@/utils/Helpers';

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
            <SidebarMenuButton
              size="lg"
              className="p-0"
              render={props => (
                <Link href={getI18nPath('/dashboard', locale)} {...props}>
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-teal-600 text-white">
                    <span className="text-sm font-semibold">
                      {AppConfig.name.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{AppConfig.name}</span>
                  </div>
                </Link>
              )}
            />
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
            Track daily sessions and review analytics weekly.
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
