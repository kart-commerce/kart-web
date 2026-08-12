import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ProductResponse } from '../../../core/http/generated/product/v1/model/productResponse';
import { ProductService } from './product.service';

const GROUP_ID = '11111111-1111-1111-1111-111111111111';

function productResponse(sku: string, color: string): ProductResponse & { productGroupId: string } {
  return {
    sku,
    name: 'Aura Phone 15 Pro',
    description: 'A phone.',
    category: { id: 'electronics', name: 'Electronics' },
    brand: 'Nova',
    price: { amount: 999, currency: 'USD' },
    status: 'Active',
    attributes: { color, extendedAttributes: { Storage: '256GB' } },
    ratingSummary: { avg: 4.6, count: 2140 },
    productGroupId: GROUP_ID,
  };
}

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ProductService);
  });

  afterEach(() => httpMock.verify());

  it('returns a product by sku, joined with its group siblings and stock', (done) => {
    service.getBySku('PHN-AURA-256-BLK').subscribe((product) => {
      expect(product?.name).toBe('Aura Phone 15 Pro');
      expect(product?.variants.length).toBe(2);
      expect(product?.inStock).toBeTrue();
      done();
    });

    httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/products/PHN-AURA-256-BLK')).flush(productResponse('PHN-AURA-256-BLK', 'Black'));
    httpMock
      .expectOne((r) => r.method === 'GET' && r.url.includes(`/product-groups/${GROUP_ID}/variants`))
      .flush([productResponse('PHN-AURA-256-BLK', 'Black'), productResponse('PHN-AURA-256-SLV', 'Silver')]);

    const stockRequests = httpMock.match((r) => r.method === 'GET' && r.url.includes('/inventory/'));
    expect(stockRequests.length).toBe(2);
    for (const req of stockRequests) {
      const sku = req.request.url.split('/').pop();
      req.flush({ sku, availableQty: 10 });
    }
  });

  it('returns undefined for an unknown sku when the backend 404s', (done) => {
    service.getBySku('does-not-exist').subscribe((product) => {
      expect(product).toBeUndefined();
      done();
    });

    httpMock
      .expectOne((r) => r.method === 'GET' && r.url.includes('/products/does-not-exist'))
      .flush('not found', { status: 404, statusText: 'Not Found' });
  });

  it('reports out-of-stock when inventory has zero availableQty', (done) => {
    service.listVariants(GROUP_ID).subscribe((variants) => {
      expect(variants[0].inStock).toBeFalse();
      done();
    });

    httpMock
      .expectOne((r) => r.method === 'GET' && r.url.includes(`/product-groups/${GROUP_ID}/variants`))
      .flush([productResponse('PHN-AURA-256-BLK', 'Black')]);
    httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/inventory/PHN-AURA-256-BLK')).flush({ sku: 'PHN-AURA-256-BLK', availableQty: 0 });
  });
});
