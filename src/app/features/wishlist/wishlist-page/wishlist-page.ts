import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Card } from '../../../shared/ui';
import { ProductService } from '../../catalog/data/product.service';
import { NotificationCenterService } from '../../notifications/data/notification-center.service';
import { ProductCard } from '../../catalog/product-card/product-card';
import { WishlistService } from '../data/wishlist.service';

/**
 * WEB-26: re-checks each wishlisted item's live price on view (same pattern as
 * cart-page's stock re-check) and raises a persisted `price-drop` notification
 * (WEB-49's notification center) the moment a lower price is observed — never a
 * push/event this app can't yet receive (kart-notification-service has no
 * customer-facing endpoint today, see notification-center.service.ts's own note).
 */
@Component({
  selector: 'kart-wishlist-page',
  imports: [RouterLink, Card, ProductCard],
  templateUrl: './wishlist-page.html',
  styleUrl: './wishlist-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WishlistPage {
  protected readonly wishlistService = inject(WishlistService);
  private readonly productService = inject(ProductService);
  private readonly notificationCenter = inject(NotificationCenterService);
  private readonly recheckedSkus = new Set<string>();

  constructor() {
    effect(() => {
      for (const item of this.wishlistService.wishlistItems()) {
        if (this.recheckedSkus.has(item.sku)) {
          continue;
        }
        this.recheckedSkus.add(item.sku);
        this.productService.getBySku(item.sku).subscribe((product) => {
          if (!product || product.price.amount >= item.price.amount) {
            return;
          }
          this.wishlistService.updateSnapshot(item.sku, {
            price: product.price,
            listPrice: product.listPrice,
            inStock: product.inStock,
          });
          this.notificationCenter.push(
            'price-drop',
            'Price drop',
            `${product.name} dropped to ${product.price.amount} ${product.price.currency}.`,
            `/p/${item.sku}`,
          );
        });
      }
    });
  }
}
