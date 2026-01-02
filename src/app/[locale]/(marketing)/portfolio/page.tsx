import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';

type IPortfolioProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: IPortfolioProps): Promise<Metadata> {
  await props.params;

  return {
    title: 'Portfolio',
    description: 'Welcome to my portfolio page!',
  };
}

export default async function Portfolio(props: IPortfolioProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <>
      <p>Welcome to my portfolio page! Here you will find a carefully curated collection of my work and accomplishments. Through this portfolio, I'm to showcase my expertise, creativity, and the value I can bring to your projects.</p>

      <div className="grid grid-cols-1 justify-items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from(Array.from({ length: 6 }).keys()).map(elt => (
          <Link
            className="hover:text-blue-700"
            key={elt}
            href={`/portfolio/${elt}`}
          >
            {`Portfolio ${elt}`}
          </Link>
        ))}
      </div>

      <div className="mt-5 text-center text-sm">
        Error reporting powered by{' '}
        <a
          className="text-blue-700 hover:border-b-2 hover:border-blue-700"
          href="https://sentry.io/for/nextjs/?utm_source=github&utm_medium=paid-community&utm_campaign=general-fy25q1-nextjs&utm_content=github-banner-nextjsboilerplate-logo"
        >
          Sentry
        </a>
        {' - Code coverage powered by '}
        <a
          className="text-blue-700 hover:border-b-2 hover:border-blue-700"
          href="https://about.codecov.io/codecov-free-trial/?utm_source=github&utm_medium=paid-community&utm_campaign=general-fy25q1-nextjs&utm_content=github-banner-nextjsboilerplate-logo"
        >
          Codecov
        </a>
      </div>

      <a
        href="https://sentry.io/for/nextjs/?utm_source=github&utm_medium=paid-community&utm_campaign=general-fy25q1-nextjs&utm_content=github-banner-nextjsboilerplate-logo"
      >
        <Image
          className="mx-auto mt-2"
          src="/assets/images/sentry-dark.png"
          alt="Sentry"
          width={128}
          height={38}
        />
      </a>
    </>
  );
};
