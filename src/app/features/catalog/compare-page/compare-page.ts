import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, map, of, switchMap } from 'rxjs';

import { Button, Card, RatingStars } from '../../../shared/ui';
import { MoneyPipe } from '../../../shared/util';
import { CartService } from '../../cart/data/cart.service';
import { CompareService } from '../data/compare.service';
import { Product } from '../data/models';
import { ProductService } from '../data/product.service';

/** WEB-19 — side-by-side comparison of the selected (session-only) SKUs. */
@Component({
  selector: 'kart-compare-page',
  imports: [Button, Card, RatingStars, MoneyPipe],
  templateUrl: './compare-page.html',
  styleUrl: './compare-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparePage {
  protected readonly compareService = inject(CompareService);
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);

  private readonly products = toSignal(
    toObservable(this.compareService.selectedSkus).pipe(
      switchMap((skus) =>
        skus.length ? forkJoin(skus.map((sku) => this.productService.getBySku(sku))) : of([]),
      ),
      map((products) => products.filter((product): product is Product => !!product)),
    ),
    { initialValue: [] },
  );

  protected readonly attributeKeys = computed(() => {
    const keys = new Set<string>();
    for (const product of this.products()) {
      for (const key of Object.keys(product.attributes)) {
        keys.add(key);
      }
    }
    return [...keys];
  });

  protected readonly visibleProducts = this.products;

  remove(sku: string): void {
    this.compareService.remove(sku);
  }

  addToCart(product: Product): void {
    this.cartService.add({
      sku: product.sku,
      name: product.name,
      thumbnailUrl: product.thumbnailUrl,
      unitPrice: product.price,
      maxQuantity: 10,
      inStock: product.inStock,
    });
  }
}
