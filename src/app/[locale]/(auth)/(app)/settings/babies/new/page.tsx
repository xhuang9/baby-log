import type { Metadata } from 'next';
import { BreadcrumbSetter } from '@/components/navigation/BreadcrumbSetter';
import { getI18nPath } from '@/utils/Helpers';
import { NewBabyForm } from './NewBabyForm';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Add Baby',
  };
}

export default async function NewBabyPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  return (
    <>
      <BreadcrumbSetter
        items={[
          { label: 'Settings', href: getI18nPath('/settings', locale) },
          { label: 'Add Baby' },
        ]}
      />
      <div className="mx-auto w-fit max-w-xl min-w-80 space-y-6 px-4 pb-20">
        <NewBabyForm
          redirectPath={getI18nPath('/settings', locale)}
          bootstrapPath={getI18nPath('/account/bootstrap', locale)}
        />
      </div>
    </>
  );
}
