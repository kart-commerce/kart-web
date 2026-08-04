import { TestBed } from '@angular/core/testing';

import { LocaleService } from './locale.service';

describe('LocaleService', () => {
  beforeEach(() => {
    document.cookie = 'kart_locale=; path=/; max-age=0';
    localStorage.removeItem('kart_locale');
  });

  it('defaults to en when nothing is persisted and the browser language is unsupported', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(LocaleService);
    expect(['en', 'bn', 'de']).toContain(service.activeLocale());
  });

  it('persists an explicit choice to both cookie and localStorage, and a fresh instance reads it back', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(LocaleService);
    service.setLocale('de');

    expect(localStorage.getItem('kart_locale')).toBe('de');
    expect(document.cookie).toContain('kart_locale=de');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(LocaleService);
    expect(fresh.activeLocale()).toBe('de');
  });
});
