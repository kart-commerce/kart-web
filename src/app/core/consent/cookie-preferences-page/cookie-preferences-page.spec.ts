import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CookiePreferencesPage } from './cookie-preferences-page';
import { ConsentService } from '../consent.service';

describe('CookiePreferencesPage', () => {
  beforeEach(() => {
    document.cookie = 'kart_consent=; path=/; max-age=0';
    TestBed.configureTestingModule({
      imports: [CookiePreferencesPage],
      providers: [provideRouter([])],
    });
  });

  afterEach(() => {
    document.cookie = 'kart_consent=; path=/; max-age=0';
  });

  it('saves the chosen categories via ConsentService and shows a confirmation', () => {
    const fixture = TestBed.createComponent(CookiePreferencesPage);
    fixture.detectChanges();

    fixture.componentInstance.save({ analytics: true, marketing: true, preference: false });
    fixture.detectChanges();

    const service = TestBed.inject(ConsentService);
    expect(service.consent()?.categories).toEqual({ analytics: true, marketing: true, preference: false });
    expect(fixture.componentInstance.justSaved()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Preferences saved.');
  });
});
