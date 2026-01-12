import { AppConfig } from '@/config/app';

export const BaseTemplate = (props: {
  leftNav: React.ReactNode;
  rightNav?: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <div className="w-full px-1 text-gray-700 antialiased">
      <div className="mx-auto max-w-screen-md">
        <header className="border-b border-gray-300">
          <div className="pt-16 pb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {AppConfig.name}
            </h1>
            <h2 className="text-xl">Starter code for your Nextjs Boilerplate with Tailwind CSS</h2>
          </div>

          <div className="flex justify-between">
            <nav aria-label="Main navigation">
              <ul className="flex flex-wrap gap-x-5 text-xl">
                {props.leftNav}
              </ul>
            </nav>

            <nav>
              <ul className="flex flex-wrap gap-x-5 text-xl">
                {props.rightNav}
              </ul>
            </nav>
          </div>
        </header>

        <main>{props.children}</main>

        <footer className="border-t border-gray-300 py-8 text-center text-sm">
          {`© Copyright ${new Date().getFullYear()} ${AppConfig.name}. `}
          <span>
            Made with
            {' '}
            <a
              href="https://nextjs-boilerplate.com"
              className="text-blue-700 hover:border-b-2 hover:border-blue-700"
            >
              Next.js Boilerplate
            </a>
            .
          </span>
        </footer>
      </div>
    </div>
  );
};
