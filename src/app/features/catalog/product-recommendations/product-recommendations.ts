import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ProductCard } from '../product-card/product-card';
import { RecommendationService } from '../data/recommendation.service';

/**
 * WEB-17 — meant to be instantiated only inside an `@defer (on viewport)` block (product-page.html):
 * Angular never runs a deferred block's content during SSR by default, so this component's
 * constructor-time fetch genuinely only happens client-side at the real trigger moment —
 * never reusing an SSR-time value, per design-decisions.md's "TransferState Trust Boundary."
 * `RecommendationService` itself fails open on error (see that service's own doc comment);
 * this component adds nothing on top except rendering an empty state when there's simply
 * nothing to show, never a visible error.
 */
@Component({
  selector: 'kart-product-recommendations',
  imports: [ProductCard],
  template: `
    @if (related().length > 0) {
      <div class="kart-product-recommendations__grid">
        @for (product of related(); track product.sku) {
          <kart-product-card [product]="product" />
        }
      </div>
    }
  `,
  styles: [
    `
      .kart-product-recommendations__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: var(--kart-spacing-lg);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductRecommendations {
  private readonly recommendationService = inject(RecommendationService);
  private readonly authService = inject(AuthService);

  readonly sku = input.required<string>();

  private readonly recommendations = toSignal(
    toObservable(this.sku).pipe(
      switchMap(() =>
        this.recommendationService.listForUser(this.authService.session()?.authenticated ? 'current-user' : null),
      ),
    ),
    { initialValue: [] },
  );

  readonly related = computed(() => this.recommendations().filter((product) => product.sku !== this.sku()));
}
