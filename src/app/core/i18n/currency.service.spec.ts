import { TestBed } from '@angular/core/testing';

import { CurrencyService } from './currency.service';
import { LocaleService } from './locale.service';

describe('CurrencyService', () => {
  beforeEach(() => {
    document.cookie = 'kart_locale=; path=/; max-age=0';
    document.cookie = 'kart_currency=; path=/; max-age=0';
    localStorage.removeItem('kart_locale');
    localStorage.removeItem('kart_currency');
  });

  it('defaults to USD when the active locale is not bn', () => {
    TestBed.configureTestingModule({});
    TestBed.inject(LocaleService).setLocale('en');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    localStorage.setItem('kart_locale', 'en');
    const service = TestBed.inject(CurrencyService);
    expect(service.activeCurrency()).toBe('USD');
  });

  it('defaults to BDT on first visit when the active locale is bn', () => {
    localStorage.setItem('kart_locale', 'bn');
    TestBed.configureTestingModule({});
    const service = TestBed.inject(CurrencyService);
    expect(service.activeCurrency()).toBe('BDT');
  });

  it('an explicit choice always wins over the locale-based default on a later visit', () => {
    localStorage.setItem('kart_locale', 'bn');
    TestBed.configureTestingModule({});
    const service = TestBed.inject(CurrencyService);
    service.setCurrency('USD');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(CurrencyService);
    expect(fresh.activeCurrency()).toBe('USD');
  });

  it('emits on currencyChanged$ when switched', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(CurrencyService);
    let emitted: string | undefined;
    service.currencyChanged$.subscribe((currency) => (emitted = currency));

    service.setCurrency('BDT');

    expect(emitted).toBe('BDT');
  });
});
