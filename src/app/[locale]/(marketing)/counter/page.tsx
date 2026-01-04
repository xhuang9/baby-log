import type { Metadata } from 'next';
import Image from 'next/image';
import { CounterForm } from '@/components/CounterForm';
import { CurrentCount } from '@/components/CurrentCount';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Counter',
    description: 'An example of DB operation',
  };
}

export default function Counter() {
  return (
    <>
      <CounterForm />

      <div className="mt-3">
        <CurrentCount />
      </div>

      <div className="mt-5 text-center text-sm">
        Security, bot detection and rate limiting powered by
        {' '}
        <a
          className="text-blue-700 hover:border-b-2 hover:border-blue-700"
          href="https://launch.arcjet.com/Q6eLbRE"
        >
          Arcjet
        </a>
      </div>

      <a
        href="https://launch.arcjet.com/Q6eLbRE"
      >
        <Image
          className="mx-auto mt-2"
          src="/assets/images/arcjet-light.svg"
          alt="Arcjet"
          width={128}
          height={38}
        />
      </a>
    </>
  );
};
