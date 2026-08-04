import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, map, of, switchMap } from 'rxjs';

import { ProductCard } from '../product-card/product-card';
import { ProductService } from '../data/product.service';
import { RecentlyViewedService } from '../data/recently-viewed.service';

/** WEB-19 — "recently viewed" rail; excludes the product currently being viewed, if any. */
@Component({
  selector: 'kart-recently-viewed-rail',
  imports: [ProductCard],
  template: `
    @if (visibleProducts().length > 0) {
      <section class="kart-recently-viewed-rail">
        <h2>Recently viewed</h2>
        <div class="kart-recently-viewed-rail__grid">
          @for (product of visibleProducts(); track product.sku) {
            <kart-product-card [product]="product" />
          }
        </div>
      </section>
    }
  `,
  styles: [
    `
      .kart-recently-viewed-rail__grid {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(180px, 220px);
        gap: var(--kart-spacing-lg);
        overflow-x: auto;
        padding-bottom: var(--kart-spacing-sm);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentlyViewedRail {
  private readonly recentlyViewed = inject(RecentlyViewedService);
  private readonly productService = inject(ProductService);

  /** Excludes the currently-viewed product's sku from its own "recently viewed" rail. */
  readonly excludeSku = input<string | null>(null);

  private readonly products = toSignal(
    toObservable(this.recentlyViewed.recentSkus).pipe(
      switchMap((skus) => {
        const filtered = skus.filter((sku) => sku !== this.excludeSku()).slice(0, 8);
        return filtered.length
          ? forkJoin(filtered.map((sku) => this.productService.getBySku(sku)))
          : of([]);
      }),
      map((products) => products.filter((product) => !!product)),
    ),
    { initialValue: [] },
  );

  readonly visibleProducts = this.products;
}
