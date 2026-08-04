import { HttpResponse, http } from 'msw';

import { CATALOG_PRODUCTS } from '../../../../testing/fixtures/catalog.fixtures';
import { FIXTURE_ACTIVE_PROMOTIONS } from '../../../../testing/fixtures/offer.fixtures';

/** WEB-4 — MSW handlers for kart-offer-service. Standing ready for `PricingService`'s eventual migration off its in-memory mock. */
export const pricingHandlers = [
  http.get('*/v1/promotions/active', () => HttpResponse.json(FIXTURE_ACTIVE_PROMOTIONS)),

  http.post('*/v1/pricing/quote', async ({ request }) => {
    const body = (await request.json()) as { items: { sku?: string; quantity?: number }[]; currency: string };
    const total = body.items.reduce((sum, item) => {
      const unitPrice = CATALOG_PRODUCTS.find((product) => product.sku === item.sku)?.price.amount ?? 0;
      return sum + unitPrice * (item.quantity ?? 0);
    }, 0);
    return HttpResponse.json({
      quoteId: 'quote-fixture-001',
      total: { amount: total, currency: body.currency },
      expiresAt: '2026-08-04T00:15:00.000Z',
    });
  }),

  http.post('*/v1/coupons/validate', async ({ request }) => {
    const body = (await request.json()) as { couponCode: string };
    const valid = body.couponCode.toUpperCase() === 'SAVE10';
    return HttpResponse.json({ valid, reason: valid ? null : 'Coupon code not found' });
  }),
];
