const steps = [
  {
    number: 1,
    title: 'Sign in',
    description: 'Create an account with your email or sign in with Google.',
  },
  {
    number: 2,
    title: 'Tap to log',
    description: 'Record feeds, sleep, and diapers with a single tap.',
  },
  {
    number: 3,
    title: 'See today\'s summary',
    description: 'View your baby\'s daily patterns at a glance.',
  },
];

export function HomeHowItWorks() {
  return (
    <section className="border-t border-border py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          How it works
        </h2>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          Three quick steps to keep everyone on the same timeline.
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:gap-12">
          <div className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-background/70 p-6 shadow-sm">
            {steps.map((step, index) => (
              <div key={step.number} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="mt-2 h-full w-px bg-border/70" />
                  )}
                </div>
                <div className="flex flex-col gap-1 pb-8">
                  <h3 className="text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="relative hidden aspect-square overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-muted/40 via-background to-secondary/30 md:block">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  App screenshots
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Add real screens here
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
