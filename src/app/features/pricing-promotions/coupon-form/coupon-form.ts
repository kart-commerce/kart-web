import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { KartInput } from '../../../shared/ui';
import { CartService } from '../../cart/data/cart.service';
import { CouponService } from '../data/coupon.service';

/** Coupon apply/remove box used on the cart page — wraps kart-offer-service's coupon validate/redeem. */
@Component({
  selector: 'kart-coupon-form',
  imports: [KartInput],
  templateUrl: './coupon-form.html',
  styleUrl: './coupon-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CouponForm {
  private readonly couponService = inject(CouponService);
  protected readonly cartService = inject(CartService);

  readonly code = signal('');
  readonly message = signal<string | null>(null);
  readonly checking = signal(false);

  apply(): void {
    const code = this.code().trim();
    if (!code || this.checking()) {
      return;
    }

    this.checking.set(true);
    this.couponService.validate(code, this.cartService.subtotal()).subscribe((result) => {
      this.checking.set(false);
      this.message.set(result.message);

      if (result.valid) {
        this.cartService.applyCoupon({ code: result.code, discount: result.discount });
        this.code.set('');
      }
    });
  }

  remove(): void {
    this.cartService.removeCoupon();
    this.message.set(null);
  }
}
