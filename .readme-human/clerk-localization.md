# Clerk UI localization (this repo)

## Current setup
- Clerk UI language is selected per request based on the current next-intl locale.
- Locale → Clerk localization mapping is defined in `src/utils/AppConfig.ts` using `@clerk/localizations`.

## Key files
- Supported locales + mapping: `src/utils/AppConfig.ts`
  ```ts
  import { enUS, frFR } from '@clerk/localizations';

  export const AppConfig = {
    locales: ['en', 'fr'],
    defaultLocale: 'en',
    localePrefix: 'as-needed',
  };

  export const ClerkLocalizations = {
    defaultLocale: enUS,
    supportedLocales: { en: enUS, fr: frFR },
  };
  ```
- ClerkProvider localization selection: `src/app/[locale]/(auth)/layout.tsx`
  ```tsx
  const clerkLocale
    = ClerkLocalizations.supportedLocales[locale] ?? ClerkLocalizations.defaultLocale;

  return <ClerkProvider localization={clerkLocale}>{props.children}</ClerkProvider>;
  ```

## How to use
- Add a supported locale:
  1) add it to `AppConfig.locales` in `src/utils/AppConfig.ts`
  2) add a Clerk localization object in `ClerkLocalizations.supportedLocales`
  3) add a message file in `src/locales/<locale>.json`
  ```ts
  import { deDE } from '@clerk/localizations';

  export const AppConfig = { locales: ['en', 'fr', 'de'], defaultLocale: 'en', localePrefix: 'as-needed' };
  export const ClerkLocalizations = {
    defaultLocale: enUS,
    supportedLocales: { en: enUS, fr: frFR, de: deDE },
  };
  ```

## Resources
- https://clerk.com/docs/localization
- https://www.npmjs.com/package/@clerk/localizations
