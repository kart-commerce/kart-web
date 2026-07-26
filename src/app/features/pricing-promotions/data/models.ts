import { Money } from '../../../shared/util/money';

/** `GET /v1/promotions/active` projection — enough to render a badge on a PDP or card. */
export interface Promotion {
  readonly promotionId: string;
  readonly label: string;
  readonly discountPercent: number;
}

/** `POST /v1/pricing/quote` response for a single line (sku + quantity). */
export interface PriceQuote {
  readonly sku: string;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly subtotal: Money;
  readonly discount: Money;
  readonly total: Money;
  readonly appliedPromotion?: Promotion;
}

export type CouponResult =
  | { readonly valid: true; readonly code: string; readonly discount: Money; readonly message: string }
  | { readonly valid: false; readonly code: string; readonly message: string };

/** A coupon that has been validated and applied to the current cart. */
export interface AppliedCoupon {
  readonly code: string;
  readonly discount: Money;
}
