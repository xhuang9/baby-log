import type { Metadata } from 'next';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';
import { NotificationsContent } from './_components/NotificationsContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Notifications',
  };
}

export default async function NotificationsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  await props.params;

  return (
    <>
      <PageTitleSetter title="Notifications" />
      <NotificationsContent />
    </>
  );
}
