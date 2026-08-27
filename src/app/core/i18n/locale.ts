export type SupportedLocale = 'en' | 'bn' | 'de';

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['en', 'bn', 'de'];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const LOCALE_LABELS: Readonly<Record<SupportedLocale, string>> = {
  en: 'English',
  bn: 'বাংলা',
  de: 'Deutsch',
};

/**
 * No launch locale is RTL (localization.md §9) — every entry is `ltr` today, but the map
 * exists (rather than a hardcoded `dir="ltr"`) so adding a future RTL language is a data
 * change here, never a template rework, matching design-tokens.md's logical-properties
 * mandate this app's CSS already follows.
 */
export const LOCALE_DIRECTION: Readonly<Record<SupportedLocale, 'ltr' | 'rtl'>> = {
  en: 'ltr',
  bn: 'ltr',
  de: 'ltr',
};

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
