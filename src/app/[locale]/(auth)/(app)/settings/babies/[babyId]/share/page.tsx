import type { Metadata } from 'next';
import { BabySharingContent } from './BabySharingContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string; babyId: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Sharing & Access',
  };
}

export default async function BabySharingPage(props: {
  params: Promise<{ locale: string; babyId: string }>;
}) {
  const { babyId } = await props.params;

  return <BabySharingContent babyId={babyId} />;
}
