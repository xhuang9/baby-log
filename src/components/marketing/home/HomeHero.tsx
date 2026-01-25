import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function HomeHero() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="pointer-events-none absolute -top-24 right-[-6rem] h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-[-4rem] h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <div className="flex flex-col gap-5">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Built for newborn routines
            </span>
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              Baby tracking, without setup.
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Log sleep and feeds in one tap. Designed for your baby&apos;s first year. No subscription.
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              <Link
                href="/sign-up/"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'w-full sm:w-auto hover:bg-primary/80',
                )}
              >
                Start free
              </Link>
              <p className="text-sm text-muted-foreground">
                No credit card. Full features.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {['Fast setup', 'Caregiver sharing', 'Daily summaries'].map(item => (
                <span
                  key={item}
                  className="rounded-full border border-border/60 bg-background/70 px-3 py-1"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-background via-background to-muted shadow-sm">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  App GIF Quick 30 Seconds
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Demo video placeholder
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
