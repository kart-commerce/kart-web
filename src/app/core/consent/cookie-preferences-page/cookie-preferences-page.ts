import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';

import { SeoService } from '../../seo/seo.service';
import { ConsentCategories } from '../consent';
import { ConsentCategoriesForm } from '../consent-categories/consent-categories';
import { ConsentService } from '../consent.service';

/**
 * WEB-11 — standalone Preference Center (privacy.md §A.3): the persistent, footer-linked surface
 * for revisiting cookie choices outside of the transient first-visit banner.
 */
@Component({
  selector: 'kart-cookie-preferences-page',
  imports: [ConsentCategoriesForm],
  templateUrl: './cookie-preferences-page.html',
  styleUrl: './cookie-preferences-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookiePreferencesPage {
  protected readonly consentService = inject(ConsentService);
  private readonly seo = inject(SeoService);

  readonly justSaved = signal(false);

  constructor() {
    effect(() => {
      this.seo.setTitle('Cookie Preferences');
      this.seo.setDescription('Manage which non-essential cookies Kart is allowed to use on this device.');
      this.seo.setCanonicalUrl('/cookie-preferences');
    });
  }

  save(categories: ConsentCategories): void {
    this.consentService.savePreferences(categories);
    this.justSaved.set(true);
  }
}
