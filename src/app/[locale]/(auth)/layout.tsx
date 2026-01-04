import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { setRequestLocale } from 'next-intl/server';
import { clerkAppearance } from '@/libs/ClerkTheme';
import { routing } from '@/libs/I18nRouting';
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
  let dashboardUrl = '/dashboard';
  let postAuthUrl = '/post-auth';
  let afterSignOutUrl = '/';

  if (locale !== routing.defaultLocale) {
    signInUrl = `/${locale}${signInUrl}`;
    signUpUrl = `/${locale}${signUpUrl}`;
    dashboardUrl = `/${locale}${dashboardUrl}`;
    postAuthUrl = `/${locale}${postAuthUrl}`;
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
      signInFallbackRedirectUrl={postAuthUrl}
      signUpFallbackRedirectUrl={postAuthUrl}
      afterSignOutUrl={afterSignOutUrl}
    >
      {props.children}
    </ClerkProvider>
  );
}
