import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { BaseTemplate } from '@/templates/BaseTemplate';

export default async function Layout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <BaseTemplate
      leftNav={(
        <>
          <li>
            <Link
              href="/"
              className="border-none text-gray-700 hover:text-gray-900"
            >
              Home
            </Link>
          </li>
        </>
      )}
      rightNav={(
        <>
          <li>
            <Link
              href="/sign-in/"
              className="border-none text-gray-700 hover:text-gray-900"
            >
              Sign in
            </Link>
          </li>

          <li>
            <Link
              href="/sign-up/"
              className="border-none text-gray-700 hover:text-gray-900"
            >
              Sign up
            </Link>
          </li>

          <li>
            <LocaleSwitcher />
          </li>
        </>
      )}
    >
      <div className="py-5 text-xl [&_p]:my-6">{props.children}</div>
    </BaseTemplate>
  );
}
