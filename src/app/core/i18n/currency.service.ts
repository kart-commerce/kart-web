import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, Signal, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';

import { readBrowserCookie, writeBrowserCookie } from '../http/browser-cookie.util';
import { DEFAULT_CURRENCY, SupportedCurrency, isSupportedCurrency } from './currency';
import { LocaleService } from './locale.service';

const CURRENCY_COOKIE = 'kart_currency';
const CURRENCY_STORAGE_KEY = 'kart_currency';
const COOKIE_MAX_AGE_DAYS = 365;

/**
 * WEB-8 — currency is an independent axis from language (localization.md's Currency Decision
 * Set): USD everywhere by default, except BDT on a genuine first visit (no persisted choice
 * yet) when the resolved locale is `bn` — an explicit choice on any later visit always wins
 * and is never silently re-overridden by locale/geo re-resolution.
 *
 * `kart-web` never computes a currency conversion client-side — switching currency here only
 * changes which currency is *requested* from `kart-offer-service`'s `/pricing/quote`; every
 * consumer must re-quote (WEB-27/WEB-30), never reuse a stale converted amount.
 */
@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly localeService = inject(LocaleService);

  private readonly currency = signal<SupportedCurrency>(this.resolveInitialCurrency());
  readonly activeCurrency: Signal<SupportedCurrency> = this.currency.asReadonly();

  /** Fires on every explicit switch — checkout/pricing consumers use this to cancel an in-flight quote (WEB-30). */
  readonly currencyChanged$ = new Subject<SupportedCurrency>();

  setCurrency(currency: SupportedCurrency): void {
    this.currency.set(currency);
    if (isPlatformBrowser(this.platformId)) {
      writeBrowserCookie(CURRENCY_COOKIE, currency, COOKIE_MAX_AGE_DAYS);
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    }
    this.currencyChanged$.next(currency);
  }

  private resolveInitialCurrency(): SupportedCurrency {
    if (!isPlatformBrowser(this.platformId)) {
      return DEFAULT_CURRENCY;
    }

    const persisted = readBrowserCookie(CURRENCY_COOKIE) ?? localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (isSupportedCurrency(persisted)) {
      return persisted;
    }

    return this.localeService.activeLocale() === 'bn' ? 'BDT' : DEFAULT_CURRENCY;
  }
}
