import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { MOCK_PRODUCTS } from '../../catalog/data/mock-catalog';
import { addMoney, multiplyMoney, subtractMoney } from '../../../shared/util/money';
import { CartQuote, PriceQuote, Promotion } from './models';

/** A single flash-sale campaign for the mock catalog, so WEB-29's countdown has a real end time to render, never a fabricated one. */
const FLASH_SALE_SKU = 'AUD-PULSE-BUD-WHT';
const FLASH_SALE_DURATION_MS = 3 * 24 * 60 * 60 * 1000;
const FLASH_SALE_STARTED_AT = Date.now();

/**
 * Stands in for kart-offer-service's `POST /v1/pricing/quote` and `GET /v1/promotions/active`.
 * A mock product's `listPrice` (when present) doubles as "this SKU has an active promotion" —
 * the discount is simply listPrice minus price, same shape the real quote endpoint would return.
 */
@Injectable({ providedIn: 'root' })
export class PricingService {
  quote(sku: string, quantity: number): Observable<PriceQuote | undefined> {
    const product = MOCK_PRODUCTS.find((candidate) => candidate.sku === sku);
    if (!product) {
      return of(undefined);
    }

    const unitPrice = product.price;
    const subtotal = multiplyMoney(unitPrice, quantity);
    const promotion = this.promotionFor(sku);
    const discount = product.listPrice
      ? subtractMoney(multiplyMoney(product.listPrice, quantity), subtotal)
      : { amount: 0, currency: unitPrice.currency };

    return of({
      sku,
      quantity,
      unitPrice,
      subtotal: product.listPrice ? multiplyMoney(product.listPrice, quantity) : subtotal,
      discount,
      total: subtotal,
      appliedPromotion: promotion,
    });
  }

  /**
   * WEB-27 — the multi-line quote cart/checkout actually re-request on every step entry
   * (checkout-and-refunds.md §A.1) and treat as stale after 15 minutes
   * (`localization.md`'s Exchange Rate Strategy, `isQuoteStale`). `currency` is accepted (never
   * computed from it client-side, requirement-spec.md §2/localization.md) purely so this mock
   * reflects the real endpoint's currency-aware contract shape.
   */
  quoteCart(
    items: readonly { readonly sku: string; readonly quantity: number }[],
    currency: string,
  ): Observable<CartQuote> {
    let subtotal = { amount: 0, currency };
    let discount = { amount: 0, currency };

    for (const item of items) {
      const product = MOCK_PRODUCTS.find((candidate) => candidate.sku === item.sku);
      if (!product) {
        continue;
      }
      subtotal = addMoney(subtotal, multiplyMoney(product.price, item.quantity));
      if (product.listPrice) {
        discount = addMoney(
          discount,
          subtractMoney(multiplyMoney(product.listPrice, item.quantity), multiplyMoney(product.price, item.quantity)),
        );
      }
    }

    const total = subtractMoney(subtotal, discount);
    return of({
      quoteId: crypto.randomUUID(),
      currency,
      subtotal,
      discount,
      total: total.amount < 0 ? { ...total, amount: 0 } : total,
      quotedAt: new Date().toISOString(),
    });
  }

  activePromotionFor(sku: string): Observable<Promotion | undefined> {
    return of(this.promotionFor(sku));
  }

  private promotionFor(sku: string): Promotion | undefined {
    const product = MOCK_PRODUCTS.find((candidate) => candidate.sku === sku);
    if (!product?.listPrice) {
      return undefined;
    }
    const percent = Math.round(
      ((product.listPrice.amount - product.price.amount) / product.listPrice.amount) * 100,
    );
    const endsAt =
      sku === FLASH_SALE_SKU ? new Date(FLASH_SALE_STARTED_AT + FLASH_SALE_DURATION_MS).toISOString() : undefined;
    return { promotionId: `promo-${sku}`, label: `${percent}% off`, discountPercent: percent, endsAt };
  }
}
