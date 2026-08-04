import { TestBed } from '@angular/core/testing';

import { LocaleService } from '../../core/i18n/locale.service';
import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  let pipe: MoneyPipe;
  let localeService: LocaleService;

  beforeEach(() => {
    // Every locale/currency-cookie-writing spec shares one browser-global localStorage/cookie
    // jar under Karma — clear before each test so a prior spec file's persisted choice (e.g.
    // LocaleService's own "de" persistence test) can never leak into this one.
    document.cookie = 'kart_locale=; path=/; max-age=0';
    localStorage.removeItem('kart_locale');

    TestBed.configureTestingModule({});
    localeService = TestBed.inject(LocaleService);
    pipe = TestBed.runInInjectionContext(() => new MoneyPipe());
  });

  it('returns an empty string for a null/undefined value', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('formats USD with en-US grouping by default', () => {
    expect(pipe.transform({ amount: 1234.5, currency: 'USD' })).toBe('$1,234.50');
  });

  it('formats with German grouping/decimal separators when the active locale is de', () => {
    localeService.setLocale('de');
    expect(pipe.transform({ amount: 1234.5, currency: 'EUR' })).toContain('1.234,50');
  });

  it('renders BDT amounts with Latin numerals even under the bn locale', () => {
    localeService.setLocale('bn');
    const result = pipe.transform({ amount: 1234, currency: 'BDT' });
    expect(result).not.toMatch(/[০-৯]/);
    expect(result).toContain('1,234');
  });
});
