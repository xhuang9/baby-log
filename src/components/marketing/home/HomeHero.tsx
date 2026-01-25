import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function HomeHero() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <div className="flex flex-col gap-5">
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
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
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
