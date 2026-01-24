import { describe, expect, it } from 'vitest';
import { routing } from '@/lib/i18n/routing';
import { getI18nPath } from './Helpers';

describe('Helpers', () => {
  describe('getI18nPath function', () => {
    it('should not change the path for default language', () => {
      const url = '/random-url';
      const locale = routing.defaultLocale;

      expect(getI18nPath(url, locale)).toBe(url);
    });

    it('should prepend the locale to the path for non-default language', () => {
      const url = '/random-url';
      const locale = 'es';

      expect(getI18nPath(url, locale)).toMatch(/^\/es/);
    });
  });
});
