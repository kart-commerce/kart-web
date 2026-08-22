import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ProductCard } from '../product-card/product-card';
import { RecommendationService } from '../data/recommendation.service';

/**
 * WEB-17 — meant to be instantiated only inside an `@defer (on viewport)` block: Angular never
 * runs a deferred block's content during SSR by default, so this component's constructor-time
 * fetch genuinely only happens client-side at the real trigger moment — never reusing an
 * SSR-time value, per design-decisions.md's "TransferState Trust Boundary." `RecommendationService`
 * itself fails open on error/no-session (see that service's own doc comment); this component adds
 * nothing on top except rendering an empty state when there's simply nothing to show, never a
 * visible error.
 *
 * Used across three placements — PDP (`excludeSkus: [product.sku]`), the home page
 * (`excludeSkus` empty), and post-purchase order confirmation/detail (`excludeSkus`: every sku in
 * the order just placed) — the backend has no per-placement concept (getRecommendationsForUser
 * only takes userId/limit), so "placement" is entirely a client-side exclusion-list concern.
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

  /** Skus to hide from the rendered list — the current PDP's own sku, every item in a just-placed order, or empty on the home page. */
  readonly excludeSkus = input<readonly string[]>([]);
  readonly limit = input(8);

  private readonly recommendations = toSignal(
    toObservable(this.limit).pipe(
      switchMap((limit) => {
        const session = this.authService.session();
        return this.recommendationService.listForUser(session?.authenticated ? session.userId ?? null : null, limit);
      }),
    ),
    { initialValue: [] },
  );

  readonly related = computed(() => {
    const exclude = this.excludeSkus();
    return this.recommendations().filter((product) => !exclude.includes(product.sku));
  });
}
