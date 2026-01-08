import Link from 'next/link';
import { getI18nPath } from '@/utils/Helpers';
import { RequestAccessForm } from './RequestAccessForm';

export default async function RequestAccessPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Request Baby Access</h1>
          <p className="text-sm text-muted-foreground">
            Ask an existing baby owner to grant you access
          </p>
        </div>

        <RequestAccessForm />

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Or
            {' '}
            <Link
              href={getI18nPath('/account/onboarding/baby', locale)}
              className="font-medium text-primary hover:underline"
            >
              create your own baby
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
