import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Card } from '../../../shared/ui';
import { MoneyPipe } from '../../../shared/util';
import { ProductService } from '../../catalog/data/product.service';
import { NotificationService } from '../../notifications/data/notification.service';
import { CouponForm } from '../../pricing-promotions/coupon-form/coupon-form';
import { CartService } from '../data/cart.service';

@Component({
  selector: 'kart-cart-page',
  imports: [RouterLink, Card, MoneyPipe, CouponForm],
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage {
  protected readonly cartService = inject(CartService);
  private readonly productService = inject(ProductService);
  private readonly notificationService = inject(NotificationService);
  private readonly recheckedSkus = new Set<string>();

  constructor() {
    // Domain Invariants #2/#4: a line already in the cart must never keep showing a stale
    // price, or as available, once the backend has signaled otherwise — re-validate both the
    // moment the cart page is viewed, not only at the original add-to-cart moment.
    effect(() => {
      for (const item of this.cartService.cartItems()) {
        if (this.recheckedSkus.has(item.sku)) {
          continue;
        }
        this.recheckedSkus.add(item.sku);
        this.productService.getBySku(item.sku).subscribe((product) => {
          const stillInStock = product?.inStock ?? false;
          if (stillInStock !== item.inStock) {
            this.cartService.setAvailability(item.sku, stillInStock);
          }
          if (product && product.price.amount !== item.unitPrice.amount) {
            this.cartService.updatePrice(item.sku, product.price);
            this.notificationService.notify(`${item.name}'s price has changed since you added it.`, 'info');
          }
        });
      }
    });
  }

  increment(sku: string, currentQuantity: number, maxQuantity: number): void {
    this.cartService.updateQuantity(sku, Math.min(currentQuantity + 1, maxQuantity));
  }

  decrement(sku: string, currentQuantity: number): void {
    this.cartService.updateQuantity(sku, currentQuantity - 1);
  }
}
