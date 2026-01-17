import type { Metadata } from 'next';
import { BreadcrumbSetter } from '@/components/navigation/BreadcrumbSetter';
import { getI18nPath } from '@/utils/Helpers';
import { EditBabyContent } from './EditBabyContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string; babyId: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Edit Baby',
  };
}

// Page is now a simple shell - all data comes from IndexedDB client-side
// No auth() calls - Clerk middleware doesn't process this route

export default async function EditBabyPage(props: {
  params: Promise<{ locale: string; babyId: string }>;
}) {
  const { locale, babyId } = await props.params;

  return (
    <>
      <BreadcrumbSetter
        items={[
          { label: 'Settings', href: getI18nPath('/settings', locale) },
          { label: 'Edit Baby' },
        ]}
      />
      <EditBabyContent babyId={babyId} locale={locale} />
    </>
  );
}
