import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Button } from '../../../shared/ui';
import { ConsentCategoriesForm } from '../consent-categories/consent-categories';
import { ConsentService } from '../consent.service';

/**
 * WEB-11 — bottom-of-viewport banner (privacy.md §A.2): three equally-prominent actions
 * (Accept All / Reject Non-Essential / Manage Preferences), never blocking the page.
 *
 * Browser-only (`isBrowser` gate): the `kart_consent` cookie is only readable from
 * `document.cookie`, so `ConsentService` always resolves "no consent yet" during SSR — without
 * this gate, the banner would render (then disappear) on every per-request-SSR page load for
 * users who already consented. Crawlers/SSR HTML gain nothing from seeing it either way.
 */
@Component({
  selector: 'kart-cookie-consent-banner',
  imports: [Button, ConsentCategoriesForm, RouterLink],
  templateUrl: './cookie-consent-banner.html',
  styleUrl: './cookie-consent-banner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookieConsentBanner {
  protected readonly consentService = inject(ConsentService);
  protected readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly managingPreferences = signal(false);
}
