import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';

import { Button } from '../../../shared/ui';
import { ConsentCategories } from '../consent';

/** Shared category-toggle list — reused by both the banner's "Manage Preferences" expansion and the standalone Preference Center page (privacy.md §A.3: same choice set, one place). */
@Component({
  selector: 'kart-consent-categories',
  imports: [Button],
  templateUrl: './consent-categories.html',
  styleUrl: './consent-categories.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsentCategoriesForm implements OnInit {
  readonly initial = input<ConsentCategories>({ analytics: false, marketing: false, preference: false });
  readonly saved = output<ConsentCategories>();

  readonly analytics = signal(false);
  readonly marketing = signal(false);
  readonly preference = signal(false);

  // Signal inputs aren't readable in the constructor even when template-bound — only from
  // ngOnInit onward. A one-time seed (not an `effect()`) is deliberate: this form is locally
  // controlled after first render, so it must not reset in-progress toggles if the parent
  // passes a new `initial` object identity on a later change-detection pass.
  ngOnInit(): void {
    const value = this.initial();
    this.analytics.set(value.analytics);
    this.marketing.set(value.marketing);
    this.preference.set(value.preference);
  }

  save(): void {
    this.saved.emit({
      analytics: this.analytics(),
      marketing: this.marketing(),
      preference: this.preference(),
    });
  }
}
