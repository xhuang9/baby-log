import { getI18nPath } from '@/utils/Helpers';
import { OnboardingBabyForm } from './OnboardingBabyForm';

export default async function OnboardingBabyPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome to Baby Log</h1>
          <p className="text-sm text-muted-foreground">
            Let's start by adding your baby's information
          </p>
        </div>

        <OnboardingBabyForm redirectPath={getI18nPath('/dashboard', locale)} />
      </div>
    </div>
  );
}
