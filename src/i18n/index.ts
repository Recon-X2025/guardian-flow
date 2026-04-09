/**
 * @file src/i18n/index.ts
 * @description Minimal i18n setup compatible with react-i18next API.
 * react-i18next is not listed as a dependency, so this module provides a
 * lightweight stub that exposes the same `useTranslation` hook interface.
 * Drop-in replace: install react-i18next + i18next and swap the export.
 */

import en from './en.json';

type TranslationKeys = keyof typeof en;

const resources: Record<string, string> = en as Record<string, string>;

/** Minimal `t()` function — returns translation or falls back to key. */
function createT(locale = 'en') {
  return function t(key: string, fallback?: string): string {
    return resources[key] ?? fallback ?? key;
  };
}

/** Drop-in stub for `useTranslation` from react-i18next. */
export function useTranslation(_ns?: string) {
  return { t: createT('en'), i18n: { language: 'en', changeLanguage: async () => {} } };
}

/** Direct translation helper for use outside React components. */
export const t = createT('en');

export default { useTranslation, t, resources };
