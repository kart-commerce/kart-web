import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { DEFAULT_LOCALE, SupportedLocale } from './locale';
import { LocaleService } from './locale.service';

type TranslationBundle = Readonly<Record<string, string>>;

const BUNDLE_LOADERS: Readonly<Record<SupportedLocale, () => Promise<{ default: TranslationBundle }>>> = {
  en: () => import('./translations/en.json'),
  bn: () => import('./translations/bn.json'),
  de: () => import('./translations/de.json'),
};

/**
 * Minimal ICU MessageFormat subset — `{param}` interpolation and a `{key, plural, one {…}
 * other {…}}` selector (the two forms this app's own copy actually needs; a fuller ICU parser
 * is a drop-in swap behind this same function signature if a future string needs `select`/
 * nested plurals).
 */
function formatIcuLite(message: string, params: Readonly<Record<string, string | number>>): string {
  const pluralPattern = /\{(\w+),\s*plural,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\}/g;
  let result = message.replace(pluralPattern, (_match, key: string, onePart: string, otherPart: string) => {
    const value = Number(params[key] ?? 0);
    const chosen = value === 1 ? onePart : otherPart;
    return chosen.replace('#', String(value));
  });

  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }

  return result;
}

/**
 * WEB-7 (scoped) — runtime-switchable translation lookup with lazy-loaded per-locale
 * bundles (translations/*.json), matching localization.md §4's "the new locale's translation
 * bundle lazy-loads if not already cached" rule. A missing key always falls back to the `en`
 * bundle (§1/§5) — the runtime fallback is a safety net for a bad hotfix/rollback race, never
 * expected in steady state (that's what the CI translation-completeness gate,
 * `scripts/check-translation-completeness.mjs`, exists to catch before merge).
 */
@Injectable({ providedIn: 'root' })
export class TranslateService {
  private readonly localeService = inject(LocaleService);
  private readonly bundleCache = new Map<SupportedLocale, TranslationBundle>();
  private readonly loadedBundles = signal<ReadonlyMap<SupportedLocale, TranslationBundle>>(new Map());

  private readonly activeBundle = computed(
    () => this.loadedBundles().get(this.localeService.activeLocale()) ?? null,
  );
  private readonly fallbackBundle = computed(() => this.loadedBundles().get(DEFAULT_LOCALE) ?? null);

  constructor() {
    void this.ensureLoaded(DEFAULT_LOCALE);
    effect(() => {
      void this.ensureLoaded(this.localeService.activeLocale());
    });
  }

  translate(key: string, params: Readonly<Record<string, string | number>> = {}): string {
    const message = this.activeBundle()?.[key] ?? this.fallbackBundle()?.[key] ?? key;
    return formatIcuLite(message, params);
  }

  /** Test-only readiness hook — awaits a given locale's bundle having finished loading. */
  ensureLoaded(locale: SupportedLocale): Promise<void> {
    return this.load(locale);
  }

  private async load(locale: SupportedLocale): Promise<void> {
    if (this.bundleCache.has(locale)) {
      return;
    }
    const { default: bundle } = await BUNDLE_LOADERS[locale]();
    this.bundleCache.set(locale, bundle);
    this.loadedBundles.set(new Map(this.bundleCache));
  }
}
