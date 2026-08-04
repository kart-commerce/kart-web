import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { addMoney, subtractMoney, ZERO_USD } from '../../../shared/util/money';
import { AppliedCoupon } from '../../pricing-promotions/data/models';
import { CartItem } from './models';

type CartBucket = 'guest' | 'user';

interface StoredCart {
  readonly items: readonly CartItem[];
  readonly coupon: AppliedCoupon | null;
}

const EMPTY_CART: StoredCart = { items: [], coupon: null };
const BUCKET_STORAGE_KEYS: Readonly<Record<CartBucket, string>> = {
  guest: 'kart-cart-guest-v1',
  user: 'kart-cart-user-v1',
};
const CART_SYNC_CHANNEL = 'kart-cart-sync';

/**
 * Stands in for kart-cart-service's `GET/POST/PATCH/DELETE /v1/cart*` (plus the coupon it
 * carries once redeemed via kart-offer-service) — see mock-catalog.ts's note on the
 * mock-now/generated-client-later approach.
 *
 * WEB-21: a guest and an authenticated session are two distinct storage buckets (never one
 * shared array silently reused across identities) — which bucket is "active" follows
 * `AuthService.session()`.
 *
 * WEB-22: `AuthService.loginCompleted$` (fired exactly once per real login completing in this
 * tab — never for `loadSession()` merely discovering an already-authenticated session on
 * boot) merges the guest cart into the user cart by summed quantity per sku (capped at
 * `maxQuantity`, matching `add()`'s own clamp rule), then clears the guest bucket — the real
 * `mergeGuestCartIntoUserCart` endpoint's documented behavior, reproduced client-side until
 * that call is wired up.
 *
 * WEB-23: a `BroadcastChannel('kart-cart-sync')` message on every write lets every other open
 * tab on the same device re-read the active bucket immediately — same-device cross-tab
 * reconciliation (Domain/UX Invariant #1). Cross-*device* sync additionally needs the
 * server-authoritative real-time channel (WEB-10), which this only complements, not replaces.
 */
@Injectable({ providedIn: 'root' })
export class CartService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private channel: BroadcastChannel | null = null;

  private readonly bucket = signal<CartBucket>(this.initialBucket());
  private readonly store = signal<StoredCart>(this.readFromStorage(this.initialBucket()));

  readonly cartItems = computed(() => this.store().items);
  readonly appliedCoupon = computed(() => this.store().coupon);
  readonly itemCount = computed(() => this.cartItems().reduce((sum, item) => sum + item.quantity, 0));
  readonly subtotal = computed(() =>
    this.cartItems().reduce(
      (sum, item) =>
        addMoney(sum, { amount: item.unitPrice.amount * item.quantity, currency: item.unitPrice.currency }),
      ZERO_USD,
    ),
  );
  readonly discount = computed(() => this.appliedCoupon()?.discount ?? ZERO_USD);
  readonly total = computed(() => {
    const total = subtractMoney(this.subtotal(), this.discount());
    return total.amount < 0 ? { ...total, amount: 0 } : total;
  });
  readonly hasUnavailableItems = computed(() => this.cartItems().some((item) => !item.inStock));

  constructor() {
    effect(() => this.writeToStorage(this.bucket(), this.store()));

    if (isPlatformBrowser(this.platformId) && typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CART_SYNC_CHANNEL);
      this.channel.onmessage = (event: MessageEvent<{ bucket: CartBucket }>) => {
        if (event.data.bucket === this.bucket()) {
          this.store.set(this.readFromStorage(this.bucket()));
        }
      };
    }

    this.authService.loginCompleted$.subscribe(() => this.mergeGuestCartIntoUserCart());
  }

  add(item: Omit<CartItem, 'quantity'>, quantity = 1): void {
    this.update((current) => {
      const existing = current.items.find((line) => line.sku === item.sku);
      if (!existing) {
        return {
          ...current,
          items: [...current.items, { ...item, quantity: Math.min(quantity, item.maxQuantity) }],
        };
      }
      return {
        ...current,
        items: current.items.map((line) =>
          line.sku === item.sku
            ? { ...line, ...item, quantity: Math.min(line.quantity + quantity, item.maxQuantity) }
            : line,
        ),
      };
    });
  }

  updateQuantity(sku: string, quantity: number): void {
    if (quantity <= 0) {
      this.remove(sku);
      return;
    }
    this.update((current) => ({
      ...current,
      items: current.items.map((line) =>
        line.sku === sku ? { ...line, quantity: Math.min(quantity, line.maxQuantity) } : line,
      ),
    }));
  }

  remove(sku: string): void {
    this.update((current) => ({ ...current, items: current.items.filter((line) => line.sku !== sku) }));
  }

  /** Marks a line's availability from a fresh stock check (WEB-24) — never left to silently read stale. */
  setAvailability(sku: string, inStock: boolean): void {
    this.update((current) => ({
      ...current,
      items: current.items.map((line) => (line.sku === sku ? { ...line, inStock } : line)),
    }));
  }

  /** Domain Invariant #2: a line's displayed price must never be staler than the last known price event. */
  updatePrice(sku: string, unitPrice: CartItem['unitPrice']): void {
    this.update((current) => ({
      ...current,
      items: current.items.map((line) => (line.sku === sku ? { ...line, unitPrice } : line)),
    }));
  }

  applyCoupon(coupon: AppliedCoupon): void {
    this.update((current) => ({ ...current, coupon }));
  }

  removeCoupon(): void {
    this.update((current) => ({ ...current, coupon: null }));
  }

  clear(): void {
    this.store.set(EMPTY_CART);
  }

  ngOnDestroy(): void {
    this.channel?.close();
  }

  private mergeGuestCartIntoUserCart(): void {
    // The persistence effect flushes to localStorage asynchronously, so the
    // *currently active* bucket's freshest state is `this.store()`, not
    // necessarily what's been written to storage yet — only the inactive
    // bucket is safe to read from storage directly.
    const guestCart = this.bucket() === 'guest' ? this.store() : this.readFromStorage('guest');
    const userCart = this.bucket() === 'user' ? this.store() : this.readFromStorage('user');

    const mergedItems: CartItem[] = [...userCart.items];
    for (const guestLine of guestCart.items) {
      const index = mergedItems.findIndex((line) => line.sku === guestLine.sku);
      if (index === -1) {
        mergedItems.push(guestLine);
      } else {
        mergedItems[index] = {
          ...mergedItems[index],
          quantity: Math.min(mergedItems[index].quantity + guestLine.quantity, mergedItems[index].maxQuantity),
        };
      }
    }

    this.bucket.set('user');
    this.store.set({ items: mergedItems, coupon: userCart.coupon ?? guestCart.coupon });
    this.writeToStorage('guest', EMPTY_CART);
  }

  private update(updater: (current: StoredCart) => StoredCart): void {
    this.store.update(updater);
  }

  private initialBucket(): CartBucket {
    return this.authService.session()?.authenticated ? 'user' : 'guest';
  }

  private readFromStorage(bucket: CartBucket): StoredCart {
    if (!isPlatformBrowser(this.platformId)) {
      return EMPTY_CART;
    }
    try {
      const raw = localStorage.getItem(BUCKET_STORAGE_KEYS[bucket]);
      return raw ? (JSON.parse(raw) as StoredCart) : EMPTY_CART;
    } catch {
      return EMPTY_CART;
    }
  }

  private writeToStorage(bucket: CartBucket, cart: StoredCart): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(BUCKET_STORAGE_KEYS[bucket], JSON.stringify(cart));
    this.channel?.postMessage({ bucket });
  }
}
