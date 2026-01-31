import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  // Files to exclude from Knip analysis
  ignore: [
    'checkly.config.ts',
    'src/lib/i18n/index.ts',
    'src/types/I18n.ts',
    'src/utils/Helpers.ts',
    'tests/**/*.ts',
  ],
  // Dependencies to ignore during analysis
  ignoreDependencies: [
    'conventional-changelog-conventionalcommits',
    // Sentry peer dependencies - explicitly pinned for compatibility
    'import-in-the-middle',
    'require-in-the-middle',
    // Used in src/lib/logger.ts - knip doesn't detect top-level await import
    '@logtape/logtape',
    // Used by shadcn UI components - knip doesn't follow component re-exports
    '@radix-ui/react-dialog',
    '@radix-ui/react-slot',
    // Used by babel-plugin-react-compiler in next.config.ts
    '@babel/core',
    '@babel/preset-env',
    'babel-loader',
    // Git hooks - config in lefthook.yml
    'lefthook',
  ],
  // Binaries to ignore during analysis
  ignoreBinaries: [
    'production', // False positive raised with dotenv-cli
  ],
  compilers: {
    css: (text: string) => [...text.matchAll(/(?<=@)import[^;]+/g)].join('\n'),
  },
};

export default config;
