import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import {
  HomeAbout,
  HomeFAQ,
  HomeFooter,
  HomeHeader,
  HomeHero,
  HomeHowItWorks,
  HomeWhy,
} from '@/components/marketing/home';

type IIndexProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: IIndexProps): Promise<Metadata> {
  await props.params;

  return {
    title: 'Baby Log',
    description: 'Log sleep and feeds in one tap. Designed for your baby\'s first year.',
  };
}

export default async function Index(props: IIndexProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-background">
      <HomeHeader />
      <main>
        <HomeHero />
        <HomeWhy />
        <HomeHowItWorks />
        <HomeFAQ />
        <HomeAbout />
      </main>
      <HomeFooter />
    </div>
  );
};
