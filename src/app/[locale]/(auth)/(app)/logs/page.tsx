import type { Metadata } from 'next';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';
import { LogsContent } from './_components/LogsContent';

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
      <LogsContent />
    </>
  );
}
