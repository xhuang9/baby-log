'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';

export function HomeHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-medium tracking-tight text-foreground">
            Babylog
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/sign-in/"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
