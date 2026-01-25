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
    title: "See today's summary",
    description: "View your baby's daily patterns at a glance.",
  },
];

export function HomeHowItWorks() {
  return (
    <section className="border-t border-border py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          How it works
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-2 md:gap-12">
          <div className="flex flex-col gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="mt-2 h-full w-px bg-border" />
                  )}
                </div>
                <div className="flex flex-col gap-1 pb-8">
                  <p className="text-sm font-semibold text-foreground">
                    Step {step.number}
                  </p>
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
          <div className="relative hidden aspect-square overflow-hidden rounded-xl border border-border bg-muted md:block">
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                App screenshots
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
