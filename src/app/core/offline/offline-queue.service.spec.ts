import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CartService } from '../../features/cart/data/cart.service';
import { OfflineQueueService } from './offline-queue.service';

const SKU = 'HOM-LAMP-ARC-BRS';
const GROUP_ID = 'group-lamp';

describe('OfflineQueueService', () => {
  let service: OfflineQueueService;
  let cartService: CartService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    httpMock = TestBed.inject(HttpTestingController);
    cartService = TestBed.inject(CartService);
    service = TestBed.inject(OfflineQueueService);

    httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/cart')).flush({ cartId: 'c1', ownerType: 'Guest', status: 'Active', items: [] }, { headers: { etag: 'v1' } });
  });

  afterEach(() => httpMock.verify());

  it('re-checks a queued sku and flags it unavailable once the product is confirmed out of stock on reconnect', () => {
    cartService.add({
      sku: SKU,
      name: 'Arc Floor Lamp',
      thumbnailUrl: '',
      unitPrice: { amount: 149, currency: 'USD' },
      maxQuantity: 5,
      inStock: true,
    });
    httpMock
      .expectOne((r) => r.method === 'POST' && r.url.includes('/cart/items'))
      .flush({ cartId: 'c1', ownerType: 'Guest', status: 'Active', items: [{ sku: SKU, quantity: 1, availability: 'Available' }] }, { headers: { etag: 'v2' } });

    service.enqueueRecheck(SKU);

    window.dispatchEvent(new Event('offline'));
    TestBed.tick();
    window.dispatchEvent(new Event('online'));
    TestBed.tick();

    httpMock.expectOne((r) => r.method === 'GET' && r.url.includes(`/products/${SKU}`)).flush({
      sku: SKU,
      name: 'Arc Floor Lamp',
      category: { id: 'home' },
      price: { amount: 149, currency: 'USD' },
      status: 'Active',
      productGroupId: GROUP_ID,
    });
    httpMock
      .expectOne((r) => r.method === 'GET' && r.url.includes(`/product-groups/${GROUP_ID}/variants`))
      .flush([{ sku: SKU, category: { id: 'home' }, price: { amount: 149, currency: 'USD' }, status: 'Active', productGroupId: GROUP_ID }]);
    httpMock.expectOne((r) => r.method === 'GET' && r.url.includes(`/inventory/${SKU}`)).flush({ sku: SKU, availableQty: 0 });

    expect(cartService.cartItems().find((item) => item.sku === SKU)?.inStock).toBeFalse();
  });

  it('does not enqueue the same sku twice', () => {
    service.enqueueRecheck('A');
    service.enqueueRecheck('A');
    TestBed.tick();

    expect(JSON.parse(localStorage.getItem('kart-offline-recheck-queue-v1') ?? '[]').length).toBe(1);
  });
});
