import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../../../core/auth/auth.service';
import { UNAUTHENTICATED_SESSION } from '../../../core/auth/models';
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

describe('CartService', () => {
  let service: CartService;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    authService = TestBed.inject(AuthService);
    authService.session.set(UNAUTHENTICATED_SESSION);
    service = TestBed.inject(CartService);
  });

  it('starts empty', () => {
    expect(service.cartItems()).toEqual([]);
    expect(service.itemCount()).toBe(0);
  });

  it('adds a new line item', () => {
    service.add(line({ sku: 'A' }));

    expect(service.cartItems().length).toBe(1);
    expect(service.itemCount()).toBe(1);
  });

  it('merges quantities when adding the same sku twice', () => {
    service.add(line({ sku: 'A' }), 2);
    service.add(line({ sku: 'A' }), 1);

    expect(service.cartItems().length).toBe(1);
    expect(service.cartItems()[0].quantity).toBe(3);
  });

  it('clamps quantity at maxQuantity', () => {
    service.add(line({ sku: 'A', maxQuantity: 2 }), 5);

    expect(service.cartItems()[0].quantity).toBe(2);
  });

  it('removes a line when quantity is updated to zero', () => {
    service.add(line({ sku: 'A' }));
    service.updateQuantity('A', 0);

    expect(service.cartItems()).toEqual([]);
  });

  it('computes subtotal across lines', () => {
    service.add(line({ sku: 'A', unitPrice: { amount: 10, currency: 'USD' } }), 2);
    service.add(line({ sku: 'B', unitPrice: { amount: 5, currency: 'USD' } }), 1);

    expect(service.subtotal()).toEqual({ amount: 25, currency: 'USD' });
  });

  it('clears all items and any applied coupon', () => {
    service.add(line({ sku: 'A' }));
    service.applyCoupon({ code: 'SAVE20', discount: { amount: 20, currency: 'USD' } });
    service.clear();

    expect(service.cartItems()).toEqual([]);
    expect(service.appliedCoupon()).toBeNull();
  });

  it('subtracts an applied coupon discount from the total, floored at zero', () => {
    service.add(line({ sku: 'A', unitPrice: { amount: 10, currency: 'USD' } }), 1);
    service.applyCoupon({ code: 'SAVE20', discount: { amount: 50, currency: 'USD' } });

    expect(service.discount()).toEqual({ amount: 50, currency: 'USD' });
    expect(service.total()).toEqual({ amount: 0, currency: 'USD' });
  });

  it('removes a previously applied coupon', () => {
    service.applyCoupon({ code: 'SAVE20', discount: { amount: 20, currency: 'USD' } });
    service.removeCoupon();

    expect(service.appliedCoupon()).toBeNull();
  });

  it('flags hasUnavailableItems when a line is out of stock', () => {
    service.add(line({ sku: 'A', inStock: true }));
    expect(service.hasUnavailableItems()).toBeFalse();

    service.setAvailability('A', false);
    expect(service.hasUnavailableItems()).toBeTrue();
  });

  it('merges the guest cart into the user cart when AuthService reports a real login, then clears the guest bucket', () => {
    service.add(line({ sku: 'A' }), 2);

    authService.session.set({ authenticated: true, roles: ['customer'] });
    authService.loginCompleted$.next();

    expect(service.cartItems().length).toBe(1);
    expect(service.cartItems()[0].sku).toBe('A');
    expect(service.cartItems()[0].quantity).toBe(2);
    expect(localStorage.getItem('kart-cart-guest-v1')).toBe(JSON.stringify({ items: [], coupon: null }));
  });

  it('sums quantities for a sku present in both the guest and user carts on merge, capped at maxQuantity', () => {
    localStorage.setItem(
      'kart-cart-user-v1',
      JSON.stringify({ items: [{ ...line({ sku: 'A', maxQuantity: 3 }), quantity: 2 }], coupon: null }),
    );
    service.add(line({ sku: 'A', maxQuantity: 3 }), 2);

    authService.session.set({ authenticated: true, roles: ['customer'] });
    authService.loginCompleted$.next();

    expect(service.cartItems().length).toBe(1);
    expect(service.cartItems()[0].quantity).toBe(3);
  });

  it('does not merge on a session load that merely discovers an already-authenticated user (loadSession never emits loginCompleted$)', () => {
    localStorage.setItem(
      'kart-cart-guest-v1',
      JSON.stringify({ items: [{ ...line({ sku: 'A' }), quantity: 1 }], coupon: null }),
    );

    authService.session.set({ authenticated: true, roles: ['customer'] });

    expect(service.cartItems()).toEqual([]);
  });
});
