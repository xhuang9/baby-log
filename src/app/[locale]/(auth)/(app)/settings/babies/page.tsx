import type { Metadata } from 'next';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';
import { BabiesManagement } from './BabiesManagement';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Manage Babies',
  };
}

// Page is now a simple shell - all data comes from IndexedDB client-side
// No auth() calls - Clerk middleware doesn't process this route

export default async function ManageBabiesPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  return (
    <>
      <PageTitleSetter title="Manage Babies" />
      <div className="mr-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Manage Babies</h1>
          <p className="text-sm text-muted-foreground">
            Add, edit, or switch between babies you're tracking
          </p>
        </div>

        <BabiesManagement locale={locale} />
      </div>
    </>
  );
}
