import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { CONSENT_VERSION } from './consent';
import { ConsentService } from './consent.service';

describe('ConsentService', () => {
  beforeEach(() => {
    document.cookie = 'kart_consent=; path=/; max-age=0';
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => {
    document.cookie = 'kart_consent=; path=/; max-age=0';
  });

  it('shows the banner when no consent has been stored yet', () => {
    const service = TestBed.inject(ConsentService);
    expect(service.bannerVisible()).toBe(true);
  });

  it('acceptAll persists all categories as true and hides the banner', () => {
    const service = TestBed.inject(ConsentService);
    service.acceptAll();

    expect(service.bannerVisible()).toBe(false);
    expect(service.consent()?.categories).toEqual({ analytics: true, marketing: true, preference: true });
    expect(document.cookie).toContain('kart_consent=');
  });

  it('rejectNonEssential persists all categories as false and hides the banner', () => {
    const service = TestBed.inject(ConsentService);
    service.rejectNonEssential();

    expect(service.bannerVisible()).toBe(false);
    expect(service.consent()?.categories).toEqual({ analytics: false, marketing: false, preference: false });
  });

  it('savePreferences stores the exact categories given', () => {
    const service = TestBed.inject(ConsentService);
    service.savePreferences({ analytics: true, marketing: false, preference: true });

    expect(service.consent()?.categories).toEqual({ analytics: true, marketing: false, preference: true });
  });

  it('re-shows the banner on navigation when the stored consent version is stale', async () => {
    document.cookie = `kart_consent=${encodeURIComponent(
      JSON.stringify({ version: CONSENT_VERSION - 1, categories: { analytics: true, marketing: true, preference: true }, timestamp: '2020-01-01T00:00:00.000Z' }),
    )}; path=/`;

    const service = TestBed.inject(ConsentService);
    expect(service.bannerVisible()).toBe(true);

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    expect(service.bannerVisible()).toBe(true);
  });

  it('reads an already-stored, current-version consent from the cookie on init', () => {
    document.cookie = `kart_consent=${encodeURIComponent(
      JSON.stringify({ version: CONSENT_VERSION, categories: { analytics: true, marketing: false, preference: false }, timestamp: '2020-01-01T00:00:00.000Z' }),
    )}; path=/`;

    const service = TestBed.inject(ConsentService);
    expect(service.bannerVisible()).toBe(false);
    expect(service.consent()?.categories).toEqual({ analytics: true, marketing: false, preference: false });
  });
});
