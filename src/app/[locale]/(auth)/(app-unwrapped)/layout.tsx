import { setRequestLocale } from 'next-intl/server';
import { AppShell } from '@/templates/AppShell';

export default async function AppUnwrappedLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <AppShell locale={locale} variant="unwrapped">
      {props.children}
    </AppShell>
  );
}
