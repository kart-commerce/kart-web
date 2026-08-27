import { TestBed } from '@angular/core/testing';

import { isQuoteStale } from './models';
import { PricingService } from './pricing.service';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PricingService);
  });

  it('quotes a product with no active promotion at its listed price', (done) => {
    service.quote('CAM-SNAP-X100', 2).subscribe((quote) => {
      expect(quote?.unitPrice).toEqual({ amount: 1399, currency: 'USD' });
      expect(quote?.total).toEqual({ amount: 2798, currency: 'USD' });
      expect(quote?.discount).toEqual({ amount: 0, currency: 'USD' });
      expect(quote?.appliedPromotion).toBeUndefined();
      done();
    });
  });

  it('quotes a discount and applied promotion for a product with a listPrice', (done) => {
    service.quote('AUD-PULSE-BUD-WHT', 1).subscribe((quote) => {
      expect(quote?.unitPrice).toEqual({ amount: 179, currency: 'USD' });
      expect(quote?.discount).toEqual({ amount: 40, currency: 'USD' });
      expect(quote?.appliedPromotion?.discountPercent).toBe(18);
      done();
    });
  });

  it('returns undefined for an unknown sku', (done) => {
    service.quote('not-a-sku', 1).subscribe((quote) => {
      expect(quote).toBeUndefined();
      done();
    });
  });

  it('reports no active promotion for a product without a listPrice', (done) => {
    service.activePromotionFor('CAM-SNAP-X100').subscribe((promotion) => {
      expect(promotion).toBeUndefined();
      done();
    });
  });

  it('reports a real endsAt for the one flash-sale sku, never for others', (done) => {
    service.activePromotionFor('AUD-PULSE-BUD-WHT').subscribe((promotion) => {
      expect(promotion?.endsAt).toBeTruthy();
      service.activePromotionFor('APL-TRK-JKT-BLU-M').subscribe((other) => {
        expect(other?.endsAt).toBeUndefined();
        done();
      });
    });
  });

  it('quoteCart sums subtotal/discount across multiple lines and stamps a fresh quotedAt', (done) => {
    service
      .quoteCart(
        [
          { sku: 'CAM-SNAP-X100', quantity: 1 },
          { sku: 'AUD-PULSE-BUD-WHT', quantity: 2 },
        ],
        'USD',
      )
      .subscribe((quote) => {
        expect(quote.subtotal).toEqual({ amount: 1399 + 179 * 2, currency: 'USD' });
        expect(quote.discount).toEqual({ amount: 40 * 2, currency: 'USD' });
        expect(quote.total).toEqual({ amount: 1399 + 179 * 2 - 40 * 2, currency: 'USD' });
        expect(isQuoteStale(quote)).toBeFalse();
        done();
      });
  });

  it('isQuoteStale flags a quote older than 15 minutes', () => {
    const staleQuote = { quotedAt: new Date(Date.now() - 16 * 60 * 1000).toISOString() };
    expect(isQuoteStale(staleQuote)).toBeTrue();
  });
});
