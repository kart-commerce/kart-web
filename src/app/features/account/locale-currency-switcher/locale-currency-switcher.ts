import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { CurrencyService } from '../../../core/i18n/currency.service';
import { SUPPORTED_CURRENCIES, SupportedCurrency } from '../../../core/i18n/currency';
import { LocaleService } from '../../../core/i18n/locale.service';
import { LOCALE_LABELS, SUPPORTED_LOCALES, SupportedLocale } from '../../../core/i18n/locale';
import { KartInput } from '../../../shared/ui';

/**
 * WEB-45 — header locale/currency switcher, two independent selectors sharing one control
 * cluster (design-decisions.md "Locale-in-URL-Path vs. Currency-Outside-URL" — currency is
 * deliberately never part of the URL). Persists via `LocaleService`/`CurrencyService`
 * (guest: cookie today; authenticated: `kart-user-service.preferences` once WEB-44's profile
 * UI exists to own that write — this component only needs to call the same
 * `setLocale`/`setCurrency` methods regardless of which persistence layer ends up backing them).
 */
@Component({
  selector: 'kart-locale-currency-switcher',
  imports: [KartInput],
  templateUrl: './locale-currency-switcher.html',
  styleUrl: './locale-currency-switcher.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocaleCurrencySwitcher {
  protected readonly localeService = inject(LocaleService);
  protected readonly currencyService = inject(CurrencyService);

  protected readonly locales = SUPPORTED_LOCALES;
  protected readonly localeLabels = LOCALE_LABELS;
  protected readonly currencies = SUPPORTED_CURRENCIES;

  changeLocale(value: string): void {
    this.localeService.setLocale(value as SupportedLocale);
  }

  changeCurrency(value: string): void {
    this.currencyService.setCurrency(value as SupportedCurrency);
  }
}
