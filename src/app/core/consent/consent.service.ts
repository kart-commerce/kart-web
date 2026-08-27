import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { readBrowserCookie, writeBrowserCookie } from '../http/browser-cookie.util';
import { ALL_CATEGORIES_ACCEPTED, ALL_CATEGORIES_REJECTED, CONSENT_VERSION, ConsentCategories, ConsentRecord } from './consent';

const CONSENT_COOKIE = 'kart_consent';
const CONSENT_COOKIE_MAX_AGE_DAYS = 365;

/**
 * WEB-11 — cookie-consent banner + Preference Center + consent versioning (privacy.md Part A).
 *
 * - `kart_consent` is itself `Necessary` category (never gated behind its own consent).
 * - A stored consent older than `CONSENT_VERSION` is "stale" and re-shows the banner — checked
 *   on every client-side route navigation (`NavigationEnd`), not only a fresh SSR page load
 *   (design-decisions.md's "Cookie-Consent Staleness Check Granularity" — closes the otherwise
 *   much-longer "next visit" exposure window for this long-lived SPA).
 * - Existing category choices are pre-filled as the re-confirmation starting point on a stale
 *   consent, never silently reset to unconsented (privacy.md §A.4).
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  private readonly stored = signal<ConsentRecord | null>(this.readFromCookie());
  /** Shows the banner both on first visit (no stored consent) and when the stored version is stale. */
  private readonly staleOverride = signal(false);

  readonly consent = this.stored.asReadonly();
  readonly bannerVisible = computed(() => {
    const record = this.stored();
    return !record || record.version < CONSENT_VERSION || this.staleOverride();
  });

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      const record = this.stored();
      this.staleOverride.set(!!record && record.version < CONSENT_VERSION);
    });
  }

  acceptAll(): void {
    this.save(ALL_CATEGORIES_ACCEPTED);
  }

  rejectNonEssential(): void {
    this.save(ALL_CATEGORIES_REJECTED);
  }

  savePreferences(categories: ConsentCategories): void {
    this.save(categories);
  }

  private save(categories: ConsentCategories): void {
    const record: ConsentRecord = { version: CONSENT_VERSION, categories, timestamp: new Date().toISOString() };
    this.stored.set(record);
    this.staleOverride.set(false);
    if (isPlatformBrowser(this.platformId)) {
      writeBrowserCookie(CONSENT_COOKIE, JSON.stringify(record), CONSENT_COOKIE_MAX_AGE_DAYS);
    }
  }

  private readFromCookie(): ConsentRecord | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const raw = readBrowserCookie(CONSENT_COOKIE);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as ConsentRecord;
    } catch {
      return null;
    }
  }
}
