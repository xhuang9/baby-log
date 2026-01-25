export function HomeAbout() {
  return (
    <section className="border-t border-border py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          About us
        </h2>
        <div className="mt-6 max-w-2xl">
          <p className="leading-7 text-muted-foreground [&:not(:first-child)]:mt-4">
            Babylog.com.au is an Australia-focused baby tracking app designed to
            reduce friction for new parents.
          </p>
          <p className="leading-7 text-muted-foreground [&:not(:first-child)]:mt-4">
            Built to be fast, simple, and calm during your baby&apos;s first year.
          </p>
        </div>
      </div>
    </section>
  );
}
