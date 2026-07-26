import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { MOCK_PRODUCTS } from '../../catalog/data/mock-catalog';
import { multiplyMoney, subtractMoney } from '../../../shared/util/money';
import { PriceQuote, Promotion } from './models';

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
    return { promotionId: `promo-${sku}`, label: `${percent}% off`, discountPercent: percent };
  }
}
