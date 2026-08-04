import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Badge, Card, RatingStars } from '../../../shared/ui';
import { MoneyPipe } from '../../../shared/util';
import { OfflineQueueService } from '../../../core/offline/offline-queue.service';
import { OnlineStatusService } from '../../../core/offline/online-status.service';
import { CartService } from '../../cart/data/cart.service';
import { NotificationService } from '../../notifications/data/notification.service';
import { WishlistService } from '../../wishlist/data/wishlist.service';
import { CompareService } from '../data/compare.service';
import { ProductSummary } from '../data/models';

/** Product tile shared by the category grid, search results, related products, and the wishlist page. */
@Component({
  selector: 'kart-product-card',
  imports: [RouterLink, Card, Badge, RatingStars, MoneyPipe],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  private readonly cartService = inject(CartService);
  private readonly notificationService = inject(NotificationService);
  private readonly onlineStatus = inject(OnlineStatusService);
  private readonly offlineQueue = inject(OfflineQueueService);
  protected readonly wishlistService = inject(WishlistService);
  protected readonly compareService = inject(CompareService);

  readonly product = input.required<ProductSummary>();

  toggleCompare(event: Event): void {
    event.preventDefault();
    this.compareService.toggle(this.product().sku);
  }

  addToCart(event: Event): void {
    event.preventDefault();
    const product = this.product();
    this.cartService.add({
      sku: product.sku,
      name: product.name,
      thumbnailUrl: product.thumbnailUrl,
      unitPrice: product.price,
      maxQuantity: 10,
      inStock: product.inStock,
    });
    if (!this.onlineStatus.isOnline()) {
      // Domain/UX Invariant #3 + edge-cases.md's offline-replay resolution: the add is safe to
      // queue, but its price/stock must be re-validated the instant connectivity returns.
      this.offlineQueue.enqueueRecheck(product.sku);
    }
    this.notificationService.notify(`${product.name} added to cart.`);
  }

  toggleWishlist(event: Event): void {
    event.preventDefault();
    const product = this.product();
    const wasWishlisted = this.wishlistService.has(product.sku);
    this.wishlistService.toggle(product);
    this.notificationService.notify(
      wasWishlisted ? `${product.name} removed from wishlist.` : `${product.name} added to wishlist.`,
      'info',
    );
  }
}
