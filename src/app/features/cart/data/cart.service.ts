import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';

import { addMoney, subtractMoney, ZERO_USD } from '../../../shared/util/money';
import { AppliedCoupon } from '../../pricing-promotions/data/models';
import { CartItem } from './models';

const STORAGE_KEY = 'kart-cart-v1';
const COUPON_STORAGE_KEY = 'kart-cart-coupon-v1';

/**
 * Stands in for kart-cart-service's `GET/POST/PATCH/DELETE /v1/cart*` (plus the coupon it
 * carries once redeemed via kart-offer-service) — see mock-catalog.ts's note on the
 * mock-now/generated-client-later approach. Persisted to localStorage (not cross-tab
 * BroadcastChannel — that's WEB-10's real-time sync channel, out of scope here per
 * SessionBroadcastService's own note) so a reload doesn't silently empty the cart.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly items = signal<readonly CartItem[]>(this.readFromStorage());
  private readonly coupon = signal<AppliedCoupon | null>(this.readCouponFromStorage());

  readonly cartItems = this.items.asReadonly();
  readonly appliedCoupon = this.coupon.asReadonly();
  readonly itemCount = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
  readonly subtotal = computed(() =>
    this.items().reduce((sum, item) => addMoney(sum, { amount: item.unitPrice.amount * item.quantity, currency: item.unitPrice.currency }), ZERO_USD),
  );
  readonly discount = computed(() => this.coupon()?.discount ?? ZERO_USD);
  readonly total = computed(() => {
    const total = subtractMoney(this.subtotal(), this.discount());
    return total.amount < 0 ? { ...total, amount: 0 } : total;
  });

  constructor() {
    effect(() => this.writeToStorage(this.items()));
    effect(() => this.writeCouponToStorage(this.coupon()));
  }

  add(item: Omit<CartItem, 'quantity'>, quantity = 1): void {
    this.items.update((current) => {
      const existing = current.find((line) => line.sku === item.sku);
      if (!existing) {
        return [...current, { ...item, quantity: Math.min(quantity, item.maxQuantity) }];
      }
      return current.map((line) =>
        line.sku === item.sku
          ? { ...line, quantity: Math.min(line.quantity + quantity, line.maxQuantity) }
          : line,
      );
    });
  }

  updateQuantity(sku: string, quantity: number): void {
    if (quantity <= 0) {
      this.remove(sku);
      return;
    }
    this.items.update((current) =>
      current.map((line) => (line.sku === sku ? { ...line, quantity: Math.min(quantity, line.maxQuantity) } : line)),
    );
  }

  remove(sku: string): void {
    this.items.update((current) => current.filter((line) => line.sku !== sku));
  }

  applyCoupon(coupon: AppliedCoupon): void {
    this.coupon.set(coupon);
  }

  removeCoupon(): void {
    this.coupon.set(null);
  }

  clear(): void {
    this.items.set([]);
    this.coupon.set(null);
  }

  private readFromStorage(): readonly CartItem[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }

  private writeToStorage(items: readonly CartItem[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  private readCouponFromStorage(): AppliedCoupon | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    try {
      const raw = localStorage.getItem(COUPON_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AppliedCoupon) : null;
    } catch {
      return null;
    }
  }

  private writeCouponToStorage(coupon: AppliedCoupon | null): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (coupon) {
      localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(coupon));
    } else {
      localStorage.removeItem(COUPON_STORAGE_KEY);
    }
  }
}
