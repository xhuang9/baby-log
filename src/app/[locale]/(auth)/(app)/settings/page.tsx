import type { Metadata } from 'next';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';
import { SettingsContent } from './_components/SettingsContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Settings',
  };
}

// Page is now a simple shell - all data comes from IndexedDB client-side
// No auth() calls - Clerk middleware doesn't process this route

export default async function SettingsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  return (
    <>
      <PageTitleSetter title="Settings" />
      <SettingsContent locale={locale} />
    </>
  );
}
