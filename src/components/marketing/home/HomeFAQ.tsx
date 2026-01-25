const faqs = [
  {
    question: 'Do I need to set up my baby first?',
    answer: 'No. You can start logging immediately.',
  },
  {
    question: 'Is this a subscription?',
    answer: 'No. One-time payment.',
  },
  {
    question: 'Can both parents use it?',
    answer: 'Yes. Shared account supported.',
  },
];

export function HomeFAQ() {
  return (
    <section className="border-t border-border bg-muted/30 py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          FAQ
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">SEO</p>
        <div className="mt-6 w-full max-w-2xl space-y-3">
          {faqs.map(faq => (
            <details
              key={faq.question}
              className="rounded-lg border border-border bg-background/60 p-4"
            >
              <summary className="cursor-pointer list-none text-left text-base font-medium text-foreground">
                {faq.question}
              </summary>
              <p className="mt-3 text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
