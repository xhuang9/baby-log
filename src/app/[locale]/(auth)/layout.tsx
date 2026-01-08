import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { setRequestLocale } from 'next-intl/server';
import { clerkAppearance } from '@/lib/clerk-theme';
import { routing } from '@/lib/i18n-routing';
import { AppConfig, ClerkLocalizations } from '@/utils/AppConfig';

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
  let accountResolveUrl = '/account/resolve';
  let afterSignOutUrl = '/';

  if (locale !== routing.defaultLocale) {
    signInUrl = `/${locale}${signInUrl}`;
    signUpUrl = `/${locale}${signUpUrl}`;
    accountResolveUrl = `/${locale}${accountResolveUrl}`;
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
      signInFallbackRedirectUrl={accountResolveUrl}
      signUpFallbackRedirectUrl={accountResolveUrl}
      afterSignOutUrl={afterSignOutUrl}
    >
      {props.children}
    </ClerkProvider>
  );
}
