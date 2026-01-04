# next-intl routing (this repo)

## Current setup
- Locales: `en` (default) and `fr`.
- Default locale uses no URL prefix (`/about`), non-default uses prefix (`/fr/about`).
- Routes are implemented under `src/app/[locale]/...`, and request-time locale routing is handled in `src/proxy.ts`.

## Key files
- Locale config: `src/utils/AppConfig.ts`
  ```ts
  export const AppConfig = {
    locales: ['en', 'fr'],
    defaultLocale: 'en',
    localePrefix: 'as-needed',
  };
  ```
- Routing definition: `src/libs/I18nRouting.ts`
  ```ts
  export const routing = defineRouting({
    locales: AppConfig.locales,
    localePrefix: AppConfig.localePrefix,
    defaultLocale: AppConfig.defaultLocale,
  });
  ```
- Request config (messages loading): `src/libs/I18n.ts`
  ```ts
  export default getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;
    const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
    return { locale, messages: (await import(`../locales/${locale}.json`)).default };
  });
  ```
- Locale-aware navigation: `src/libs/I18nNavigation.ts`
  ```ts
  export const { usePathname } = createNavigation(routing);
  ```
- Root locale layout: `src/app/[locale]/layout.tsx`
  ```tsx
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  return <NextIntlClientProvider>{props.children}</NextIntlClientProvider>;
  ```
- Request pipeline (next-intl middleware): `src/proxy.ts`
  ```ts
  const handleI18nRouting = createMiddleware(routing);
  export default async function proxy(request: NextRequest) {
    return handleI18nRouting(request);
  }
  ```

## How to use
- Server translations: `import { getTranslations } from 'next-intl/server'`
- Server component example:
  ```tsx
  import { getTranslations } from 'next-intl/server';

  export default async function Page() {
    const t = await getTranslations('HomePage');
    return <h1>{t('title')}</h1>;
  }
  ```
- Client translations: `import { useTranslations } from 'next-intl'`
- Client component example:
  ```tsx
  'use client';
  import { useTranslations } from 'next-intl';

  export function Title() {
    const t = useTranslations('HomePage');
    return <h1>{t('title')}</h1>;
  }
  ```
- Links/redirects: use `@/libs/I18nNavigation` exports (don’t hardcode `/fr/...`).
  ```tsx
  'use client';
  import { useLocale } from 'next-intl';
  import { useRouter } from 'next/navigation';
  import { usePathname } from '@/libs/I18nNavigation';
  import { routing } from '@/libs/I18nRouting';

  export function LocaleSwitcher() {
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();

    return (
      <select
        defaultValue={locale}
        onChange={(e) => {
          router.push(`/${e.target.value}${pathname}`);
          router.refresh();
        }}
      >
        {routing.locales.map(l => <option key={l} value={l}>{l}</option>)}
      </select>
    );
  }
  ```

## Resources
- https://next-intl.dev/docs
- https://nextjs.org/docs/app/building-your-application/routing/middleware
