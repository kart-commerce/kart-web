import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Card } from '../../../shared/ui';
import { MoneyPipe } from '../../../shared/util';
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

  increment(sku: string, currentQuantity: number, maxQuantity: number): void {
    this.cartService.updateQuantity(sku, Math.min(currentQuantity + 1, maxQuantity));
  }

  decrement(sku: string, currentQuantity: number): void {
    this.cartService.updateQuantity(sku, currentQuantity - 1);
  }
}
