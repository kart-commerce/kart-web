import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

import { deleteBrowserCookie, readBrowserCookie, writeBrowserCookie } from '../http/browser-cookie.util';
import { DEFAULT_LOCALE, SupportedLocale, isSupportedLocale } from './locale';

const LOCALE_COOKIE = 'kart_locale';
const LOCALE_STORAGE_KEY = 'kart_locale';
const COOKIE_MAX_AGE_DAYS = 365;

/**
 * WEB-7 (scoped): resolves and persists the active display locale.
 *
 * Resolution order (localization.md §2), simplified for this pass — full server-side
 * URL-path-segment resolution (`/en/…`, `/bn/…`, `/de/…`) is flagged as a follow-up in the
 * delivery report rather than built here, since it requires restructuring every existing
 * route and every `routerLink` in the app to be locale-aware, a much larger, higher-risk
 * change than the runtime mechanism itself:
 *
 * 1. `kart_locale` cookie (guest) / `localStorage` mirror — an explicit prior choice always wins.
 * 2. `navigator.language` (best-effort client-side stand-in for server-parsed `Accept-Language`).
 * 3. `DEFAULT_LOCALE` ('en').
 *
 * Authenticated persistence (`kart-user-service.preferences.locale`) is wired once WEB-44's
 * profile UI exists — this service exposes `setLocale` as the single point that future call
 * site will also update.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly activeLocale = signal<SupportedLocale>(this.resolveInitialLocale());

  setLocale(locale: SupportedLocale): void {
    this.activeLocale.set(locale);
    if (isPlatformBrowser(this.platformId)) {
      writeBrowserCookie(LOCALE_COOKIE, locale, COOKIE_MAX_AGE_DAYS);
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
  }

  /** Test/erasure-flow helper — clears the persisted explicit choice, reverting to auto-detection. */
  clearPersistedChoice(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    deleteBrowserCookie(LOCALE_COOKIE);
    localStorage.removeItem(LOCALE_STORAGE_KEY);
  }

  private resolveInitialLocale(): SupportedLocale {
    if (!isPlatformBrowser(this.platformId)) {
      return DEFAULT_LOCALE;
    }

    const persisted = readBrowserCookie(LOCALE_COOKIE) ?? localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isSupportedLocale(persisted)) {
      return persisted;
    }

    const browserLanguage = navigator.language?.split('-')[0];
    if (isSupportedLocale(browserLanguage)) {
      return browserLanguage;
    }

    return DEFAULT_LOCALE;
  }
}
