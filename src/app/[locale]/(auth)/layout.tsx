import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { setRequestLocale } from 'next-intl/server';
import { AppConfig, ClerkLocalizations } from '@/config/app';
import { clerkAppearance } from '@/lib/clerk-theme';
import { routing } from '@/lib/i18n-routing';

export const metadata: Metadata = {
  title: `${AppConfig.name} | Account`,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AuthLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const clerkLocale = ClerkLocalizations.supportedLocales[locale] ?? ClerkLocalizations.defaultLocale;
  let signInUrl = '/sign-in';
  let signUpUrl = '/sign-up';
  let accountBootstrapUrl = '/account/bootstrap';
  let afterSignOutUrl = '/';

  if (locale !== routing.defaultLocale) {
    signInUrl = `/${locale}${signInUrl}`;
    signUpUrl = `/${locale}${signUpUrl}`;
    accountBootstrapUrl = `/${locale}${accountBootstrapUrl}`;
    afterSignOutUrl = `/${locale}${afterSignOutUrl}`;
  }

  return (
    <ClerkProvider
      appearance={{
        ...clerkAppearance,
        // Ensure Clerk is compatible with Tailwind CSS v4
        layout: {
          ...clerkAppearance.layout,
        },
      }}
      localization={clerkLocale}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      signInFallbackRedirectUrl={accountBootstrapUrl}
      signUpFallbackRedirectUrl={accountBootstrapUrl}
      afterSignOutUrl={afterSignOutUrl}
    >
      {props.children}
    </ClerkProvider>
  );
}
