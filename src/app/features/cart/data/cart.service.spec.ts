import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../../../core/auth/auth.service';
import { UNAUTHENTICATED_SESSION } from '../../../core/auth/models';
import { CartResponse } from '../../../core/http/generated/cart/v1/model/cartResponse';
import { CartService } from './cart.service';
import { CartItem } from './models';

function line(overrides: Partial<CartItem> & Pick<CartItem, 'sku'>): Omit<CartItem, 'quantity'> {
  return {
    name: 'Test product',
    thumbnailUrl: 'data:image/svg+xml;base64,',
    unitPrice: { amount: 10, currency: 'USD' },
    maxQuantity: 5,
    inStock: true,
    ...overrides,
  };
}

function serverCart(items: readonly { sku: string; quantity: number }[]): CartResponse {
  return {
    cartId: 'cart-1',
    ownerType: 'Guest',
    status: 'Active',
    items: items.map((i) => ({ sku: i.sku, quantity: i.quantity, availability: 'Available' })),
  } as CartResponse;
}

describe('CartService', () => {
  let service: CartService;
  let authService: AuthService;
  let httpMock: HttpTestingController;

  function flushInitialGet(items: readonly { sku: string; quantity: number }[] = []): void {
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/cart'));
    req.flush(serverCart(items), { headers: { etag: 'v1' } });

    // Any pre-seeded line has no display-cache entry yet, so CartService falls back to a real
    // ProductService.getBySku(sku) lookup to backfill name/thumbnail/price.
    for (const item of items) {
      httpMock.expectOne((r) => r.method === 'GET' && r.url.includes(`/products/${item.sku}`)).flush({
        sku: item.sku,
        name: 'Test product',
        category: { id: 'cat-1' },
        price: { amount: 10, currency: 'USD' },
        status: 'Active',
        productGroupId: 'group-1',
      });
      httpMock
        .expectOne((r) => r.method === 'GET' && r.url.includes(`/product-groups/group-1/variants`))
        .flush([]);
    }
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    authService = TestBed.inject(AuthService);
    authService.session.set(UNAUTHENTICATED_SESSION);
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(CartService);
  });

  afterEach(() => httpMock.verify());

  it('starts empty after hydrating from the server', () => {
    flushInitialGet();

    expect(service.cartItems()).toEqual([]);
    expect(service.itemCount()).toBe(0);
  });

  it('adds a new line item via the real add-to-cart endpoint', () => {
    flushInitialGet();

    service.add(line({ sku: 'A' }));
    const req = httpMock.expectOne((r) => r.method === 'POST' && r.url.includes('/cart/items'));
    expect(req.request.body).toEqual({ sku: 'A', quantity: 1 });
    req.flush(serverCart([{ sku: 'A', quantity: 1 }]), { headers: { etag: 'v2' } });

    expect(service.cartItems().length).toBe(1);
    expect(service.itemCount()).toBe(1);
    expect(service.cartItems()[0].name).toBe('Test product');
  });

  it('removes a line when quantity is updated to zero', () => {
    flushInitialGet([{ sku: 'A', quantity: 1 }]);

    service.updateQuantity('A', 0);
    const req = httpMock.expectOne((r) => r.method === 'DELETE' && r.url.includes('/cart/items/A'));
    req.flush(null, { headers: { etag: 'v3' } });
    httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/cart')).flush(serverCart([]), { headers: { etag: 'v3' } });

    expect(service.cartItems()).toEqual([]);
  });

  it('computes subtotal across lines using cached display prices', () => {
    flushInitialGet();

    service.add(line({ sku: 'A', unitPrice: { amount: 10, currency: 'USD' } }), 2);
    httpMock
      .expectOne((r) => r.method === 'POST' && r.url.includes('/cart/items'))
      .flush(serverCart([{ sku: 'A', quantity: 2 }]), { headers: { etag: 'v2' } });

    expect(service.subtotal()).toEqual({ amount: 20, currency: 'USD' });
  });

  it('applies and removes a coupon locally (display-only — kart-cart-service has no coupon field)', () => {
    flushInitialGet();

    service.applyCoupon({ code: 'SAVE20', discount: { amount: 5, currency: 'USD' } });
    expect(service.appliedCoupon()?.code).toBe('SAVE20');

    service.removeCoupon();
    expect(service.appliedCoupon()).toBeNull();
  });

  it('subtracts an applied coupon discount from the total, floored at zero', () => {
    flushInitialGet();

    service.add(line({ sku: 'A', unitPrice: { amount: 10, currency: 'USD' } }), 1);
    httpMock
      .expectOne((r) => r.method === 'POST' && r.url.includes('/cart/items'))
      .flush(serverCart([{ sku: 'A', quantity: 1 }]), { headers: { etag: 'v2' } });

    service.applyCoupon({ code: 'SAVE20', discount: { amount: 50, currency: 'USD' } });

    expect(service.discount()).toEqual({ amount: 50, currency: 'USD' });
    expect(service.total()).toEqual({ amount: 0, currency: 'USD' });
  });

  it('flags hasUnavailableItems when the server marks a line FlaggedUnavailable', () => {
    flushInitialGet([{ sku: 'A', quantity: 1 }]);
    expect(service.hasUnavailableItems()).toBeFalse();

    service.setAvailability('A', false);
    expect(service.hasUnavailableItems()).toBeTrue();
  });

  it('calls the real merge endpoint on a genuine login completion', () => {
    flushInitialGet();

    authService.session.set({ authenticated: true, roles: ['customer'], userId: 'user-1' });
    authService.loginCompleted$.next();

    const req = httpMock.expectOne((r) => r.method === 'POST' && r.url.includes('/cart/merge'));
    req.flush(serverCart([{ sku: 'A', quantity: 2 }]), { headers: { etag: 'v9' } });

    httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/products/A')).flush({
      sku: 'A',
      name: 'Test product',
      category: { id: 'cat-1' },
      price: { amount: 10, currency: 'USD' },
      status: 'Active',
      productGroupId: 'group-1',
    });
    httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/product-groups/group-1/variants')).flush([]);

    expect(service.cartItems().length).toBe(1);
    expect(service.cartItems()[0].sku).toBe('A');
  });
});
