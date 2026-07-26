import { TestBed } from '@angular/core/testing';

import { ProductSummary } from '../../catalog/data/models';
import { WishlistService } from './wishlist.service';

function product(sku: string): ProductSummary {
  return {
    sku,
    groupId: sku,
    name: `Product ${sku}`,
    brand: 'Test',
    categoryId: 'electronics',
    thumbnailUrl: '',
    price: { amount: 10, currency: 'USD' },
    ratingAverage: 4,
    ratingCount: 10,
    inStock: true,
  };
}

describe('WishlistService', () => {
  let service: WishlistService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(WishlistService);
  });

  it('starts empty', () => {
    expect(service.wishlistItems()).toEqual([]);
    expect(service.has('A')).toBeFalse();
  });

  it('adds a product and reports it as present', () => {
    service.add(product('A'));

    expect(service.has('A')).toBeTrue();
    expect(service.count()).toBe(1);
  });

  it('does not duplicate an already-wishlisted product', () => {
    service.add(product('A'));
    service.add(product('A'));

    expect(service.count()).toBe(1);
  });

  it('toggle adds when absent and removes when present', () => {
    service.toggle(product('A'));
    expect(service.has('A')).toBeTrue();

    service.toggle(product('A'));
    expect(service.has('A')).toBeFalse();
  });
});
