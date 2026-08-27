import { TestBed } from '@angular/core/testing';

import { CurrencyService } from '../../../core/i18n/currency.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { LocaleCurrencySwitcher } from './locale-currency-switcher';

describe('LocaleCurrencySwitcher', () => {
  beforeEach(() => {
    document.cookie = 'kart_locale=; path=/; max-age=0';
    document.cookie = 'kart_currency=; path=/; max-age=0';
    localStorage.removeItem('kart_locale');
    localStorage.removeItem('kart_currency');

    TestBed.configureTestingModule({ imports: [LocaleCurrencySwitcher] });
  });

  it('changing the language select updates LocaleService', () => {
    const fixture = TestBed.createComponent(LocaleCurrencySwitcher);
    fixture.detectChanges();
    const localeService = TestBed.inject(LocaleService);

    const select = fixture.nativeElement.querySelector('select[aria-label="Language"]') as HTMLSelectElement;
    select.value = 'de';
    select.dispatchEvent(new Event('change'));

    expect(localeService.activeLocale()).toBe('de');
  });

  it('changing the currency select updates CurrencyService', () => {
    const fixture = TestBed.createComponent(LocaleCurrencySwitcher);
    fixture.detectChanges();
    const currencyService = TestBed.inject(CurrencyService);

    const select = fixture.nativeElement.querySelector('select[aria-label="Currency"]') as HTMLSelectElement;
    select.value = 'BDT';
    select.dispatchEvent(new Event('change'));

    expect(currencyService.activeCurrency()).toBe('BDT');
  });
});
