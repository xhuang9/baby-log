import type { Metadata } from 'next';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';
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
      <PageTitleSetter title="Add Baby" />
      <div className="mr-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Add a Baby</h1>
          <p className="text-sm text-muted-foreground">
            Add another baby to track
          </p>
        </div>

        <NewBabyForm
          redirectPath={getI18nPath('/settings/babies', locale)}
        />
      </div>
    </>
  );
}
