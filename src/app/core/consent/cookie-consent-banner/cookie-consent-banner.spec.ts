import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CookieConsentBanner } from './cookie-consent-banner';
import { ConsentService } from '../consent.service';

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    document.cookie = 'kart_consent=; path=/; max-age=0';
    TestBed.configureTestingModule({
      imports: [CookieConsentBanner],
      providers: [provideRouter([]), { provide: PLATFORM_ID, useValue: 'browser' }],
    });
  });

  afterEach(() => {
    document.cookie = 'kart_consent=; path=/; max-age=0';
  });

  it('shows all three actions with equal prominence when no consent is stored', () => {
    const fixture = TestBed.createComponent(CookieConsentBanner);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Manage Preferences');
    expect(text).toContain('Reject Non-Essential');
    expect(text).toContain('Accept All');
  });

  it('hides after Accept All is clicked', () => {
    const fixture = TestBed.createComponent(CookieConsentBanner);
    fixture.detectChanges();

    TestBed.inject(ConsentService).acceptAll();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.kart-cookie-banner')).toBeNull();
  });

  it('expands to the category form when Manage Preferences is clicked', () => {
    const fixture = TestBed.createComponent(CookieConsentBanner);
    fixture.detectChanges();

    fixture.componentInstance.managingPreferences.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('kart-consent-categories')).not.toBeNull();
  });

  it('does not render during SSR (non-browser platform)', () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    const fixture = TestBed.createComponent(CookieConsentBanner);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.kart-cookie-banner')).toBeNull();
  });
});
