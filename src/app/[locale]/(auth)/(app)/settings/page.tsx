import type { Metadata } from 'next';
import { SettingsContent } from './SettingsContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Settings',
  };
}

export default async function SettingsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  await props.params;

  return <SettingsContent />;
}
