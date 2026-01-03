import type { Metadata } from 'next';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Analytics',
  };
}

export default async function AnalyticsPage(props: { params: Promise<{ locale: string }> }) {
  await props.params;
  return (
    <>
      <PageTitleSetter title="Analytics" />
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Track trends and performance over time.</p>
      </div>
    </>
  );
}
