import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { readBrowserCookie, writeBrowserCookie } from '../http/browser-cookie.util';

const GUEST_SESSION_COOKIE = 'kart_guest_cart_session';
const GUEST_SESSION_COOKIE_MAX_AGE_DAYS = 365;

/**
 * Opaque, client-generated anonymous-session id sent as `X-Guest-Session-Id`
 * on every Cart/Wishlist call a guest makes (kart-cart-service's
 * `guestSessionAuth` security scheme) — `Necessary` cookie category
 * (privacy.md §A.1: "cart-session identifier for guests"), no consent gate.
 * Generated once per browser and persisted for a year; cart/checkout are
 * CSR-only routes (seo.md), so this never needs a server-side counterpart.
 */
@Injectable({ providedIn: 'root' })
export class GuestSessionService {
  private readonly platformId = inject(PLATFORM_ID);
  private cachedId: string | null = null;

  /** `undefined` on the server — no guest session concept applies to SSR (public, cacheable pages only). */
  getOrCreateId(): string | undefined {
    if (!isPlatformBrowser(this.platformId)) {
      return undefined;
    }
    if (this.cachedId) {
      return this.cachedId;
    }

    const existing = readBrowserCookie(GUEST_SESSION_COOKIE);
    if (existing) {
      this.cachedId = existing;
      return existing;
    }

    const created = crypto.randomUUID();
    writeBrowserCookie(GUEST_SESSION_COOKIE, created, GUEST_SESSION_COOKIE_MAX_AGE_DAYS);
    this.cachedId = created;
    return created;
  }
}
