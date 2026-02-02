import type { ComponentProps, ComponentType } from 'react';

import {
  BathIcon,
  FeedIcon,
  GrowthIcon,
  IndoorPlayIcon,
  MedicineIcon,
  NappyIcon,
  OutdoorPlayIcon,
  PottyIcon,
  PumpingIcon,
  SkinToSkinIcon,
  SleepIcon,
  SolidsIcon,
  TemperatureIcon,
  TummyTimeIcon,
} from '@/components/icons/baby';

type IconItem = {
  key: string;
  label: string;
  Icon: ComponentType<ComponentProps<'svg'>>;
  background: string;
};

const iconItems: IconItem[] = [
  {
    key: 'feed',
    label: 'Feed',
    Icon: FeedIcon,
    background: 'var(--color-activity-feed-background)',
  },
  {
    key: 'sleep',
    label: 'Sleep',
    Icon: SleepIcon,
    background: 'var(--color-activity-sleep-background)',
  },
  {
    key: 'nappy',
    label: 'Nappy',
    Icon: NappyIcon,
    background: 'var(--color-activity-nappy-background)',
  },
  {
    key: 'solids',
    label: 'Solids',
    Icon: SolidsIcon,
    background: 'var(--color-activity-solids-background)',
  },
  {
    key: 'bath',
    label: 'Bath',
    Icon: BathIcon,
    background: 'var(--color-activity-bath-background)',
  },
  {
    key: 'temperature',
    label: 'Temperature',
    Icon: TemperatureIcon,
    background: 'var(--accent)',
  },
  {
    key: 'tummy-time',
    label: 'Tummy time',
    Icon: TummyTimeIcon,
    background: 'var(--color-activity-tummy-time-background)',
  },
  {
    key: 'skin-to-skin',
    label: 'Skin to skin',
    Icon: SkinToSkinIcon,
    background: 'var(--color-activity-skin-to-skin-background)',
  },
  {
    key: 'outdoor-play',
    label: 'Outdoor play',
    Icon: OutdoorPlayIcon,
    background: 'var(--color-activity-outdoor-play-background)',
  },
  {
    key: 'indoor-play',
    label: 'Indoor play',
    Icon: IndoorPlayIcon,
    background: 'var(--color-activity-indoor-play-background)',
  },
  {
    key: 'medicine',
    label: 'Medicine',
    Icon: MedicineIcon,
    background: 'var(--secondary)',
  },
  {
    key: 'growth',
    label: 'Growth',
    Icon: GrowthIcon,
    background: 'var(--primary)',
  },
  {
    key: 'pumping',
    label: 'Pumping',
    Icon: PumpingIcon,
    background: 'var(--accent)',
  },
  {
    key: 'potty',
    label: 'Potty',
    Icon: PottyIcon,
    background: 'var(--muted)',
  },
];

export function BabyIconSet() {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 text-base shadow-sm">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase">
          Baby app icon set
        </span>
        <h1 className="text-2xl font-semibold text-foreground">
          Activity icons for daily moments
        </h1>
        <div className="max-w-2xl text-sm text-muted-foreground">
          Solid, single-color icons ready for feed, sleep, care, and play tracking.
        </div>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {iconItems.map((item) => {
          const Icon = item.Icon;

          return (
            <li
              key={item.key}
              className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4 shadow-sm"
            >
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-background"
                style={{ color: item.background }}
              >
                <Icon className="size-8" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                {item.label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
