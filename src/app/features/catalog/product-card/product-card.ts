import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Badge, Card, RatingStars } from '../../../shared/ui';
import { MoneyPipe } from '../../../shared/util';
import { CartService } from '../../cart/data/cart.service';
import { NotificationService } from '../../notifications/data/notification.service';
import { WishlistService } from '../../wishlist/data/wishlist.service';
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
  protected readonly wishlistService = inject(WishlistService);

  readonly product = input.required<ProductSummary>();

  addToCart(event: Event): void {
    event.preventDefault();
    const product = this.product();
    this.cartService.add({
      sku: product.sku,
      name: product.name,
      thumbnailUrl: product.thumbnailUrl,
      unitPrice: product.price,
      maxQuantity: 10,
    });
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
