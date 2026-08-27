import { TestBed } from '@angular/core/testing';

import { LocaleService } from './locale.service';
import { TranslateService } from './translate.service';

describe('TranslateService', () => {
  beforeEach(() => {
    document.cookie = 'kart_locale=; path=/; max-age=0';
    localStorage.removeItem('kart_locale');
    TestBed.configureTestingModule({});
  });

  it('translates a plain key from the en bundle', async () => {
    const service = TestBed.inject(TranslateService);
    await service.ensureLoaded('en');

    expect(service.translate('common.actions.add_to_cart')).toBe('Add to cart');
  });

  it('falls back to the key itself when nothing matches in any loaded bundle', async () => {
    const service = TestBed.inject(TranslateService);
    await service.ensureLoaded('en');

    expect(service.translate('does.not.exist')).toBe('does.not.exist');
  });

  it('resolves the ICU-lite plural form based on count', async () => {
    const service = TestBed.inject(TranslateService);
    await service.ensureLoaded('en');

    expect(service.translate('common.cart.item_count', { count: 1 })).toBe('1 item');
    expect(service.translate('common.cart.item_count', { count: 3 })).toBe('3 items');
  });

  it('loads the German bundle and translates once the locale switches', async () => {
    const locale = TestBed.inject(LocaleService);
    const service = TestBed.inject(TranslateService);

    locale.setLocale('de');
    await service.ensureLoaded('de');

    expect(service.translate('common.actions.add_to_cart')).toBe('In den Warenkorb');
  });
});
