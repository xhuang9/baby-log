import type { Metadata } from 'next';
import type { ComponentProps, ComponentType } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { HomeFooter, HomeHeader } from '@/components/marketing/home';
import * as icons from '@/components/icons';

type IconComponent = ComponentType<ComponentProps<'svg'>>;

type IconEntry = {
  name: string;
  label: string;
  Icon: IconComponent;
  color: string;
};

type IconPageProps = {
  params: Promise<{ locale: string }>;
};

const formatLabel = (name: string) => name
  .replace(/Icon$/, '')
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2');

const iconThemeColors: Record<string, string> = {
  BathIcon: 'var(--color-activity-bath-background)',
  FeedIcon: 'var(--color-activity-feed-background)',
  GrowthIcon: 'var(--primary)',
  IndoorPlayIcon: 'var(--color-activity-indoor-play-background)',
  MedicineIcon: 'var(--secondary)',
  NappyIcon: 'var(--color-activity-nappy-background)',
  OutdoorPlayIcon: 'var(--color-activity-outdoor-play-background)',
  PottyIcon: 'var(--muted)',
  PumpingIcon: 'var(--accent)',
  SkinToSkinIcon: 'var(--color-activity-skin-to-skin-background)',
  SleepIcon: 'var(--color-activity-sleep-background)',
  SolidsIcon: 'var(--color-activity-solids-background)',
  TemperatureIcon: 'var(--accent)',
  TummyTimeIcon: 'var(--color-activity-tummy-time-background)',
};

const iconEntries: IconEntry[] = Object.entries(icons)
  .filter(([, Icon]) => typeof Icon === 'function')
  .map(([name, Icon]) => ({
    name,
    label: formatLabel(name),
    Icon: Icon as IconComponent,
    color: iconThemeColors[name] ?? 'var(--foreground)',
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

const SampleIcon = icons.FeedIcon as IconComponent;

export async function generateMetadata(props: IconPageProps): Promise<Metadata> {
  await props.params;

  return {
    title: 'Icon Library · Baby Log',
    description: 'Preview every SVG icon component from the Baby Log library.',
  };
}

export default async function IconPage(props: IconPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HomeHeader />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-16 right-[-6rem] h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-[-4rem] h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16 md:py-20">
          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold tracking-[0.4em] text-muted-foreground uppercase">
              Icon Library
            </span>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Baby Log marketing icons
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              All icon components exported from
              {' '}
              <code className="rounded-full border border-border bg-background/70 px-2 py-0.5 text-xs text-foreground">
                @/components/icons
              </code>
              .
            </p>
          </div>

          <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-foreground">Sample activity tile</h2>
                <p className="text-sm text-muted-foreground">
                  iOS-inspired tile concept with primary icon and activity tint.
                </p>
              </div>
              <div className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                Feed preview
              </div>
            </div>

            <div className="mt-6">
              <div className="relative overflow-hidden rounded-2xl bg-card p-5 shadow-sm">
                <div
                  className="pointer-events-none absolute inset-0 opacity-10"
                  style={{ backgroundColor: 'var(--color-activity-feed-background)' }}
                />
                <div className="relative flex items-start gap-4">
                  <div
                    className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-background/80 shadow-sm"
                    style={{ color: 'var(--primary)' }}
                  >
                    <SampleIcon className="size-7" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-semibold text-foreground">Feed</h3>
                    <p className="text-sm text-muted-foreground">
                      21h 55m ago - 4m breast feed (end on right)
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">
                      - by Father
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-foreground">Full icon set</h2>
                <p className="text-sm text-muted-foreground">
                  {iconEntries.length}
                  {' '}
                  components ready for product and marketing screens.
                </p>
              </div>
              <div className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                SVG • fill-current
              </div>
            </div>

            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="list">
              {iconEntries.map((entry) => {
                const Icon = entry.Icon;

                return (
                  <li
                    key={entry.name}
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-background/80 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div
                      className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-background via-background to-muted/60"
                      style={{ color: entry.color }}
                    >
                      <Icon className="size-7" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {entry.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {entry.name}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
