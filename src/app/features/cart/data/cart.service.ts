import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { DefaultService as CartApi } from '../../../core/http/generated/cart/v1';
import { CartLineItem } from '../../../core/http/generated/cart/v1/model/cartLineItem';
import { ProductService } from '../../catalog/data/product.service';
import { addMoney, subtractMoney, ZERO_USD } from '../../../shared/util/money';
import { AppliedCoupon } from '../../pricing-promotions/data/models';
import { CartItem } from './models';

/** A line's own maxQuantity is a UI clamp only — kart-cart-service enforces no per-line cap itself. */
const DEFAULT_MAX_QUANTITY = 10;
const CART_SYNC_CHANNEL = 'kart-cart-sync';

/**
 * Real kart-cart-service (`GET/POST/PATCH/DELETE /v1/cart*`, `POST /v1/cart/merge`) — owner
 * resolution (logged-in user vs. guest session) happens server-side per request, via the
 * `Authorization` bearer token or the `X-Guest-Session-Id` header (`guest-session.interceptor.ts`
 * attaches the latter); this service no longer needs its own guest/user storage-bucket split.
 *
 * The server's own `CartLineItem` is only `{sku, quantity, availability}` — no name/thumbnail/
 * price — so display fields are cached client-side at add-time and lazily backfilled via
 * `ProductService.getBySku` for any sku the cache doesn't already have (e.g. a cart hydrated
 * fresh on a new device/tab).
 *
 * Coupon state (`appliedCoupon`/`applyCoupon`/`removeCoupon`) stays client-local/display-only —
 * kart-cart-service's own `CartResponse` has no coupon field, and kart-order-service's
 * `CreateOrder` contract has no discount field either (a real, documented cross-service gap, not
 * fixed this session — see the flow's known-limitations note).
 */
@Injectable({ providedIn: 'root' })
export class CartService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private readonly cartApi = inject(CartApi);
  private readonly productService = inject(ProductService);
  private channel: BroadcastChannel | null = null;

  private readonly displayCache = new Map<string, Omit<CartItem, 'quantity' | 'inStock'>>();
  private readonly etag = signal<string | undefined>(undefined);
  private readonly coupon = signal<AppliedCoupon | null>(null);

  readonly cartItems = signal<readonly CartItem[]>([]);
  readonly appliedCoupon = this.coupon.asReadonly();
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
    if (isPlatformBrowser(this.platformId)) {
      this.refreshFromServer().subscribe();

      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel(CART_SYNC_CHANNEL);
        this.channel.onmessage = () => this.refreshFromServer().subscribe();
      }
    }

    this.authService.loginCompleted$.subscribe(() => this.mergeGuestCartIntoUserCart());
  }

  add(item: Omit<CartItem, 'quantity'>, quantity = 1): void {
    this.displayCache.set(item.sku, item);
    this.cartApi
      .addCartItem({ sku: item.sku, quantity }, this.etag(), 'response')
      .pipe(switchMap((response) => this.applyServerCart(response)))
      .subscribe({ next: () => this.broadcast(), error: () => this.refreshFromServer().subscribe() });
  }

  updateQuantity(sku: string, quantity: number): void {
    if (quantity <= 0) {
      this.remove(sku);
      return;
    }
    this.cartApi
      .setCartItemQuantity(sku, { quantity }, this.etag(), 'response')
      .pipe(switchMap((response) => this.applyServerCart(response)))
      .subscribe({ next: () => this.broadcast(), error: () => this.refreshFromServer().subscribe() });
  }

  remove(sku: string): void {
    this.cartApi
      .removeCartItem(sku, this.etag(), 'response')
      .pipe(switchMap(() => this.refreshFromServer()))
      .subscribe({ next: () => this.broadcast(), error: () => this.refreshFromServer().subscribe() });
  }

  /** Marks a line's availability from a fresh stock check (WEB-24) — never left to silently read stale. */
  setAvailability(sku: string, inStock: boolean): void {
    this.cartItems.update((current) => current.map((line) => (line.sku === sku ? { ...line, inStock } : line)));
  }

  /** Domain Invariant #2: a line's displayed price must never be staler than the last known price event. */
  updatePrice(sku: string, unitPrice: CartItem['unitPrice']): void {
    const cached = this.displayCache.get(sku);
    if (cached) {
      this.displayCache.set(sku, { ...cached, unitPrice });
    }
    this.cartItems.update((current) => current.map((line) => (line.sku === sku ? { ...line, unitPrice } : line)));
  }

  applyCoupon(coupon: AppliedCoupon): void {
    this.coupon.set(coupon);
  }

  removeCoupon(): void {
    this.coupon.set(null);
  }

  /** Best-effort: records the analytics-only CartCheckedOut event server-side, then drops local state — see class doc comment. */
  clear(): void {
    this.cartApi
      .checkoutCart()
      .pipe(catchError(() => of(undefined)))
      .subscribe(() => {
        this.cartItems.set([]);
        this.coupon.set(null);
        this.etag.set(undefined);
        this.displayCache.clear();
        this.broadcast();
      });
  }

  ngOnDestroy(): void {
    this.channel?.close();
  }

  private mergeGuestCartIntoUserCart(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.cartApi
      .mergeGuestCartIntoUserCart('response')
      .pipe(
        switchMap((response) => this.applyServerCart(response)),
        catchError(() => this.refreshFromServer()),
      )
      .subscribe(() => this.broadcast());
  }

  private refreshFromServer() {
    return this.cartApi.getCurrentCart('response').pipe(
      switchMap((response) => this.applyServerCart(response)),
      catchError(() => of(undefined)),
    );
  }

  /** Merges the server's authoritative `{sku, quantity, availability}` lines with cached/re-fetched display fields. */
  private applyServerCart(response: { body: { items: readonly CartLineItem[] } | null; headers: { get(name: string): string | null } }) {
    this.etag.set(response.headers.get('etag') ?? undefined);
    const items = response.body?.items ?? [];

    if (items.length === 0) {
      this.cartItems.set([]);
      return of(undefined);
    }

    return forkJoin(items.map((line) => this.toCartItem(line))).pipe(
      tap((cartItems) => this.cartItems.set(cartItems)),
      map(() => undefined),
    );
  }

  private toCartItem(line: CartLineItem) {
    const cached = this.displayCache.get(line.sku);
    const inStock = line.availability === 'Available';

    if (cached) {
      return of({ ...cached, quantity: line.quantity, inStock });
    }

    return this.productService.getBySku(line.sku).pipe(
      map((product) => ({
        sku: line.sku,
        name: product?.name ?? line.sku,
        thumbnailUrl: product?.thumbnailUrl ?? '',
        unitPrice: product?.price ?? ZERO_USD,
        maxQuantity: DEFAULT_MAX_QUANTITY,
        quantity: line.quantity,
        inStock,
      })),
      tap((item) => this.displayCache.set(line.sku, item)),
    );
  }

  private broadcast(): void {
    this.channel?.postMessage({});
  }
}
