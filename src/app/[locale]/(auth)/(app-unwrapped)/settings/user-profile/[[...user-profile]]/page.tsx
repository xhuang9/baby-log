import type { Metadata } from 'next';
import { UserProfile } from '@clerk/nextjs';
import { setRequestLocale } from 'next-intl/server';
import { BreadcrumbSetter } from '@/components/navigation/BreadcrumbSetter';
import { getI18nPath } from '@/utils/Helpers';

type IUserProfilePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: IUserProfilePageProps): Promise<Metadata> {
  await props.params;

  return {
    title: 'User Profile',
  };
}

export default async function UserProfilePage(props: IUserProfilePageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <>
      <BreadcrumbSetter
        items={[
          { label: 'Settings', href: getI18nPath('/settings', locale) },
          { label: 'User Profile' },
        ]}
      />
      <UserProfile
        path={getI18nPath('/settings/user-profile', locale)}
      />
    </>
  );
};
