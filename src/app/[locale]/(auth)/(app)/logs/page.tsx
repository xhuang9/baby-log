import type { Metadata } from 'next';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Logs',
  };
}

export default async function LogsPage(props: { params: Promise<{ locale: string }> }) {
  await props.params;
  return (
    <>
      <PageTitleSetter title="Logs" />
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Browse every entry and filter by time or log type.</p>
      </div>
    </>
  );
}
