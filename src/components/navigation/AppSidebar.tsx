'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useTransition } from 'react';
import { getUserBabies, setDefaultBaby } from '@/actions/babyActions';
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
import { useBabyStore } from '@/stores/useBabyStore';
import { getI18nPath } from '@/utils/Helpers';

type AppSidebarProps = {
  locale: string;
};

export const AppSidebar = ({ locale, ...props }: AppSidebarProps & React.ComponentProps<typeof Sidebar>) => {
  const pathname = usePathname();
  const router = useRouter();
  const activeBaby = useBabyStore(state => state.activeBaby);
  const allBabies = useBabyStore(state => state.allBabies);
  const isHydrated = useBabyStore(state => state.isHydrated);
  const hydrate = useBabyStore(state => state.hydrate);
  const setActiveBaby = useBabyStore(state => state.setActiveBaby);
  const setAllBabies = useBabyStore(state => state.setAllBabies);
  const [isPending, startTransition] = useTransition();
  const hasFetchedBabies = useRef(false);

  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [isHydrated, hydrate]);

  // Fetch all babies once on mount
  useEffect(() => {
    if (isHydrated && !hasFetchedBabies.current) {
      hasFetchedBabies.current = true;
      getUserBabies().then((result) => {
        if (result.success) {
          setAllBabies(result.babies);
        }
      });
    }
  }, [isHydrated, setAllBabies]);

  const displayName = activeBaby?.name || 'Baby Log';
  const hasMultipleBabies = allBabies.length > 1;

  const handleCycleBaby = () => {
    if (!activeBaby || allBabies.length <= 1) {
      return;
    }

    const currentIndex = allBabies.findIndex(b => b.babyId === activeBaby.babyId);
    const nextIndex = (currentIndex + 1) % allBabies.length;
    const nextBaby = allBabies[nextIndex];

    if (!nextBaby) {
      return;
    }

    startTransition(async () => {
      const result = await setDefaultBaby(nextBaby.babyId);
      if (result.success) {
        setActiveBaby(result.baby);
        router.refresh();
      }
    });
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {hasMultipleBabies
              ? (
                  <SidebarMenuButton
                    size="lg"
                    className="p-0"
                    onClick={handleCycleBaby}
                    disabled={isPending}
                  >
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-teal-600 text-white">
                      <span className="text-sm font-semibold">
                        {displayName.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center gap-2 text-left text-sm leading-tight">
                      <span className="line-clamp-2 font-semibold">{displayName}</span>
                      <ChevronDown className={`size-4 shrink-0 ${isPending ? 'animate-pulse' : ''}`} />
                    </div>
                  </SidebarMenuButton>
                )
              : (
                  <SidebarMenuButton
                    size="lg"
                    className="p-0"
                    render={buttonProps => (
                      <Link href={getI18nPath('/overview', locale)} {...buttonProps}>
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-teal-600 text-white">
                          <span className="text-sm font-semibold">
                            {displayName.slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-1 items-center gap-2 text-left text-sm leading-tight">
                          <span className="line-clamp-2 font-semibold">{displayName}</span>
                        </div>
                      </Link>
                    )}
                  />
                )}
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
