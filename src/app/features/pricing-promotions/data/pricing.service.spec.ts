import { TestBed } from '@angular/core/testing';

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
});
