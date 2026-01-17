import type { Metadata } from 'next';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';
import { OverviewContent } from './_components/OverviewContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Overview',
  };
}

// Page is now a simple shell - all data comes from IndexedDB client-side
// No auth() calls - Clerk middleware doesn't process this route
// This enables offline support

export default async function OverviewPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  return (
    <>
      <PageTitleSetter title="Overview" />
      <OverviewContent locale={locale} />
    </>
  );
}
