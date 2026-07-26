import { TestBed } from '@angular/core/testing';

import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductService);
  });

  it('returns a product by sku', (done) => {
    service.getBySku('PHN-AURA-256-BLK').subscribe((product) => {
      expect(product?.name).toBe('Aura Phone 15 Pro');
      done();
    });
  });

  it('returns undefined for an unknown sku', (done) => {
    service.getBySku('does-not-exist').subscribe((product) => {
      expect(product).toBeUndefined();
      done();
    });
  });

  it('lists products for a category', (done) => {
    service.listByCategory('electronics').subscribe((products) => {
      expect(products.length).toBeGreaterThan(0);
      expect(products.every((product) => product.categoryId === 'electronics')).toBeTrue();
      done();
    });
  });

  it('sorts by price ascending', (done) => {
    service.listByCategory('electronics', 'price-asc').subscribe((products) => {
      const amounts = products.map((product) => product.price.amount);
      expect(amounts).toEqual([...amounts].sort((a, b) => a - b));
      done();
    });
  });

  it('sorts by price descending', (done) => {
    service.listByCategory('electronics', 'price-desc').subscribe((products) => {
      const amounts = products.map((product) => product.price.amount);
      expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
      done();
    });
  });

  it('sorts by rating', (done) => {
    service.listByCategory('electronics', 'rating').subscribe((products) => {
      const ratings = products.map((product) => product.ratingAverage);
      expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
      done();
    });
  });

  it('excludes the product itself from related products', (done) => {
    service.listRelated('PHN-AURA-256-BLK').subscribe((related) => {
      expect(related.some((product) => product.sku === 'PHN-AURA-256-BLK')).toBeFalse();
      expect(related.every((product) => product.categoryId === 'electronics')).toBeTrue();
      done();
    });
  });
});
