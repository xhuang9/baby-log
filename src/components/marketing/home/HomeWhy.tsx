import { Baby, CreditCard, Zap } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Instant logging',
    description: 'No complex forms. Log activities in seconds while holding your baby.',
  },
  {
    icon: Baby,
    title: 'Made for 0-12 months',
    description: 'Features tailored for newborn care, including feed, sleep, and diaper tracking.',
  },
  {
    icon: CreditCard,
    title: 'Pay once, use freely',
    description: 'No monthly fees. No subscriptions. One payment for lifetime access.',
  },
];

export function HomeWhy() {
  return (
    <section className="border-t border-border bg-muted/30 py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Why Babylog
        </h2>
        <p className="mt-3 text-center text-sm text-muted-foreground md:text-base">
          Calm, focused, and built for the moments you&apos;re holding your baby.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map(feature => (
            <div
              key={feature.title}
              className="group flex h-full flex-col gap-4 rounded-2xl border border-border/60 bg-background/70 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-border"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition group-hover:bg-primary/15">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="leading-7 text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
