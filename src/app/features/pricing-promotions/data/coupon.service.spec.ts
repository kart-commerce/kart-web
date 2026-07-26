import { TestBed } from '@angular/core/testing';

import { CouponService } from './coupon.service';

describe('CouponService', () => {
  let service: CouponService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CouponService);
  });

  it('rejects an unknown code', (done) => {
    service.validate('NOT-REAL', { amount: 100, currency: 'USD' }).subscribe((result) => {
      expect(result.valid).toBeFalse();
      done();
    });
  });

  it('applies a percentage discount for a valid code', (done) => {
    service.validate('WELCOME10', { amount: 100, currency: 'USD' }).subscribe((result) => {
      expect(result.valid).toBeTrue();
      if (result.valid) {
        expect(result.discount).toEqual({ amount: 10, currency: 'USD' });
      }
      done();
    });
  });

  it('caps the discount at the coupon max', (done) => {
    service.validate('WELCOME10', { amount: 10000, currency: 'USD' }).subscribe((result) => {
      expect(result.valid).toBeTrue();
      if (result.valid) {
        expect(result.discount.amount).toBe(50);
      }
      done();
    });
  });

  it('rejects a code when the subtotal is below its minimum', (done) => {
    service.validate('SAVE20', { amount: 50, currency: 'USD' }).subscribe((result) => {
      expect(result.valid).toBeFalse();
      done();
    });
  });

  it('is case-insensitive and trims whitespace', (done) => {
    service.validate('  welcome10  ', { amount: 100, currency: 'USD' }).subscribe((result) => {
      expect(result.valid).toBeTrue();
      done();
    });
  });
});
