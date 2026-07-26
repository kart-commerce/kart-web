import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Money } from '../../../shared/util/money';
import { CouponResult } from './models';

interface MockCoupon {
  readonly code: string;
  readonly minSubtotal: number;
  readonly discountPercent: number;
  readonly maxDiscount: number;
}

const MOCK_COUPONS: readonly MockCoupon[] = [
  { code: 'WELCOME10', minSubtotal: 0, discountPercent: 10, maxDiscount: 50 },
  { code: 'SAVE20', minSubtotal: 100, discountPercent: 20, maxDiscount: 40 },
];

/** Stands in for kart-offer-service's `POST /v1/coupons/validate` and `POST /v1/coupons/redeem`. */
@Injectable({ providedIn: 'root' })
export class CouponService {
  validate(code: string, subtotal: Money): Observable<CouponResult> {
    const normalized = code.trim().toUpperCase();
    const coupon = MOCK_COUPONS.find((candidate) => candidate.code === normalized);

    if (!coupon) {
      return of({ valid: false, code: normalized, message: 'This coupon code is not valid.' });
    }
    if (subtotal.amount < coupon.minSubtotal) {
      return of({
        valid: false,
        code: normalized,
        message: `Add ${coupon.minSubtotal - subtotal.amount} more to your cart to use this coupon.`,
      });
    }

    const discountAmount = Math.min((subtotal.amount * coupon.discountPercent) / 100, coupon.maxDiscount);
    return of({
      valid: true,
      code: normalized,
      discount: { amount: discountAmount, currency: subtotal.currency },
      message: `${coupon.discountPercent}% off applied.`,
    });
  }

  /** Mock redemption is a no-op — the real endpoint records usage against the coupon's redemption limit. */
  redeem(code: string): Observable<void> {
    void code;
    return of(undefined);
  }
}
