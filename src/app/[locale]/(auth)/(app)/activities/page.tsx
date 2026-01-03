import type { Metadata } from 'next';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Activities',
  };
}

export default async function ActivitiesPage(props: { params: Promise<{ locale: string }> }) {
  await props.params;
  return (
    <>
      <PageTitleSetter title="Activities" />
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Activities</h1>
        <p className="text-sm text-muted-foreground">Review recent sessions, highlights, and daily logs.</p>
      </div>
    </>
  );
}
