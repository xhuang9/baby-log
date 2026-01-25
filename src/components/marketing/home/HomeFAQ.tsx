import { Plus } from 'lucide-react';

const faqs = [
  {
    question: 'How fast is setup?',
    answer: 'Create a baby profile in under a minute, then start logging right away. You can edit details anytime.',
  },
  {
    question: 'What can I track?',
    answer: 'Feeds, sleep, and diapers with quick, one-tap entries designed for tired hands.',
  },
  {
    question: 'Can both parents or caregivers use it?',
    answer: 'Yes. Invite another caregiver so everyone logs to the same timeline.',
  },
  {
    question: 'Is it a subscription?',
    answer: 'No subscription. Start free, and unlock full access with a one-time payment when you are ready.',
  },
  {
    question: 'Can I add more than one baby?',
    answer: 'Yes. Manage multiple babies and switch between them from the same account.',
  },
];

export function HomeFAQ() {
  return (
    <section className="border-t border-border bg-muted/30 py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            FAQ
          </h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Quick answers to the questions parents ask most.
          </p>
        </div>
        <div className="mt-8 w-full max-w-3xl space-y-3">
          {faqs.map(faq => (
            <details
              key={faq.question}
              className="group rounded-2xl border border-border/60 bg-background/70 p-5 shadow-sm transition"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium text-foreground">
                <span>{faq.question}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground transition group-open:rotate-45 group-open:text-foreground">
                  <Plus className="h-4 w-4" />
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
