import type { Metadata } from 'next';
import type { ActivityType } from '../(auth)/(app)/overview/_components/ActivityTile';
import { notFound } from 'next/navigation';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';
import { ActivityTile } from '../(auth)/(app)/overview/_components/ActivityTile';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Dev Palette',
  };
}

export const dynamic = 'force-dynamic';

const activityTiles: Array<{
  title: string;
  subtitle: string;
  activity: ActivityType;
}> = [
  { title: 'Feed', subtitle: 'Tap to log a feed', activity: 'feed' },
  { title: 'Sleep', subtitle: 'Coming soon', activity: 'sleep' },
  { title: 'Nappy', subtitle: 'Coming soon', activity: 'nappy' },
  { title: 'Solids', subtitle: 'Coming soon', activity: 'solids' },
  { title: 'Bath', subtitle: 'Coming soon', activity: 'bath' },
  { title: 'Tummy time', subtitle: 'Coming soon', activity: 'tummy-time' },
  { title: 'Story time', subtitle: 'Coming soon', activity: 'story-time' },
  { title: 'Screen time', subtitle: 'Coming soon', activity: 'screen-time' },
  { title: 'Skin-to-skin', subtitle: 'Coming soon', activity: 'skin-to-skin' },
  { title: 'Outdoor play', subtitle: 'Coming soon', activity: 'outdoor-play' },
  { title: 'Indoor play', subtitle: 'Coming soon', activity: 'indoor-play' },
  { title: 'Brush teeth', subtitle: 'Coming soon', activity: 'brush-teeth' },
];

const paletteSwatches = activityTiles.map(tile => ({
  key: tile.activity,
  label: tile.title,
  backgroundVar: `--color-activity-${tile.activity}-background`,
  foregroundVar: `--color-activity-${tile.activity}-foreground`,
}));

export default async function DevPalettePage(props: {
  params: Promise<{ locale: string }>;
}) {
  await props.params;

  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return (
    <>
      <PageTitleSetter title="Dev Palette" />
      <div className="space-y-8 p-4">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Activity Tiles</h2>
          <p className="text-sm text-muted-foreground">
            Local-only palette preview. This page is hidden in production.
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activityTiles.map(tile => (
              <ActivityTile
                key={tile.activity}
                title={tile.title}
                statusText={tile.subtitle}
                activity={tile.activity}
              />
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Swatches</h2>
          <p className="text-sm text-muted-foreground">
            Background and foreground tokens used by activities.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paletteSwatches.map(swatch => (
              <div
                key={swatch.key}
                className="rounded-lg border p-4"
                style={{
                  backgroundColor: `var(${swatch.backgroundVar})`,
                  color: `var(${swatch.foregroundVar})`,
                }}
              >
                <div className="text-sm font-semibold">{swatch.label}</div>
                <div className="text-xs opacity-80">{swatch.backgroundVar}</div>
                <div className="text-xs opacity-80">{swatch.foregroundVar}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
