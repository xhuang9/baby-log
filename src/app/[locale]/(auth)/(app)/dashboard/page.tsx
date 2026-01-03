import type { Metadata } from 'next';
import { Hello } from '@/components/Hello';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Dashboard',
  };
}

export default function Dashboard() {
  return (
    <>
      <PageTitleSetter title="Dashboard" />
      <Hello />
    </>
  );
}
