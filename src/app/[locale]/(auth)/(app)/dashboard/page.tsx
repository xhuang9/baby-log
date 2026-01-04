import type { Metadata } from 'next';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Dashboard',
  };
}

export default async function Dashboard() {
  return (
    <>
      <PageTitleSetter title="Dashboard" />
    </>
  );
}
