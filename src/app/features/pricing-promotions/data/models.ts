import { Money } from '../../../shared/util/money';

/** `GET /v1/promotions/active` projection — enough to render a badge on a PDP or card. */
export interface Promotion {
  readonly promotionId: string;
  readonly label: string;
  readonly discountPercent: number;
  /** Real end-of-campaign timestamp (kart-offer-service's `window.endsAt`) — never a fabricated countdown target (no-dark-patterns invariant). */
  readonly endsAt?: string;
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

/** A multi-line quote — the shape cart/checkout actually need (localization.md's 15-minute staleness rule applies to the whole quote). */
export interface CartQuote {
  readonly quoteId: string;
  readonly currency: string;
  readonly subtotal: Money;
  readonly discount: Money;
  readonly total: Money;
  readonly quotedAt: string;
}

/** localization.md "Exchange Rate Strategy": a cached quote older than this is never reused at checkout. */
export const QUOTE_STALENESS_MS = 15 * 60 * 1000;

export function isQuoteStale(quote: Pick<CartQuote, 'quotedAt'>, now = Date.now()): boolean {
  return now - new Date(quote.quotedAt).getTime() > QUOTE_STALENESS_MS;
}

export type CouponResult =
  | { readonly valid: true; readonly code: string; readonly discount: Money; readonly message: string }
  | { readonly valid: false; readonly code: string; readonly message: string };

/** A coupon that has been validated and applied to the current cart. */
export interface AppliedCoupon {
  readonly code: string;
  readonly discount: Money;
}
