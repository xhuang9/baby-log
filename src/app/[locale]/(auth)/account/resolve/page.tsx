import { redirect } from 'next/navigation';
import { resolveAccountContext } from '@/actions/babyActions';
import { getI18nPath } from '@/utils/Helpers';
import { ResolveAccountClient } from './ResolveAccountClient';

export const dynamic = 'force-dynamic';

export default async function AccountResolvePage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  const result = await resolveAccountContext();

  if (!result.success) {
    redirect(getI18nPath('/sign-in', locale));
  }

  const { user, nextStep } = result;

  // Determine redirect path based on next step
  let redirectPath: string;
  let stateData: unknown = null;

  switch (nextStep.type) {
    case 'locked':
      redirectPath = getI18nPath('/account/locked', locale);
      break;
    case 'requestAccess':
      redirectPath = getI18nPath('/account/request-access', locale);
      break;
    case 'shared':
      redirectPath = getI18nPath('/account/shared', locale);
      stateData = nextStep.invites;
      break;
    case 'onboarding':
      redirectPath = getI18nPath('/account/onboarding/baby', locale);
      break;
    case 'select':
      redirectPath = getI18nPath('/account/select-baby', locale);
      stateData = nextStep.babies;
      break;
    case 'dashboard':
      redirectPath = getI18nPath('/dashboard', locale);
      stateData = nextStep.baby;
      break;
    default:
      redirectPath = getI18nPath('/dashboard', locale);
  }

  return (
    <ResolveAccountClient
      user={user}
      baby={nextStep.type === 'dashboard' ? nextStep.baby : null}
      redirectPath={redirectPath}
      stateData={stateData}
    />
  );
}
