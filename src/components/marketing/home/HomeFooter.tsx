import Link from 'next/link';

export function HomeFooter() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="text-xl font-medium tracking-tight text-foreground">
            Babylog
          </Link>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
            <a
              href="mailto:hello@babylog.com.au"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Email: hello@babylog.com.au
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Facebook"
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">
            {new Date().getFullYear()}
            {' '}
            Babylog. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
